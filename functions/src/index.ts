/**
 * HW Guardian server logic.
 *
 * Everything that touches a number a child could benefit from lives here and
 * nowhere else: points, streaks, badge awards and reward deductions. The
 * clients only ever set intent ("approved", "requested"); the numbers are
 * derived server-side by the Admin SDK, which bypasses Firestore rules.
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as logger from 'firebase-functions/logger';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { applyApproval, type ChildAwardState } from './shared/awards';
import type { Task } from './shared/types';

initializeApp();
const db = getFirestore();

// Keep this in sync with VITE_FUNCTIONS_REGION in .env.local.
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// ---------------------------------------------------------------------------
// Points, streaks and badges — the only place these are ever written.
// ---------------------------------------------------------------------------

export const onTaskApproved = onDocumentUpdated(
  'households/{householdId}/tasks/{taskId}',
  async (event) => {
    const before = event.data?.before.data() as Task | undefined;
    const after = event.data?.after.data() as Task | undefined;
    if (!before || !after) return;

    const justApproved = before.status !== 'approved' && after.status === 'approved';
    if (!justApproved || after.pointsCredited) return;

    const { householdId, taskId } = event.params;
    const householdRef = db.doc(`households/${householdId}`);
    const taskRef = db.doc(`households/${householdId}/tasks/${taskId}`);
    const childRef = db.doc(`households/${householdId}/children/${after.childId}`);

    const [householdSnap, badgeSnap] = await Promise.all([
      householdRef.get(),
      childRef.collection('badges').get(),
    ]);
    const timezone = (householdSnap.data()?.timezone as string) || 'UTC';
    const earnedBadgeKeys = badgeSnap.docs.map((d) => d.id);

    const newBadgeKeys = await db.runTransaction(async (tx) => {
      const [taskDoc, childDoc] = await Promise.all([tx.get(taskRef), tx.get(childRef)]);

      // Idempotency: a retried delivery must not pay out twice.
      if (taskDoc.data()?.pointsCredited) return [];
      if (!childDoc.exists) {
        logger.warn('Approved task for a child that no longer exists', { taskId });
        tx.update(taskRef, { pointsCredited: true });
        return [];
      }

      const child = childDoc.data() as Partial<ChildAwardState>;
      const state: ChildAwardState = {
        totalPoints: child.totalPoints ?? 0,
        currentStreak: child.currentStreak ?? 0,
        longestStreak: child.longestStreak ?? 0,
        lastCompletedDate: child.lastCompletedDate ?? null,
        tasksApproved: child.tasksApproved ?? 0,
      };

      const approvedAt = new Date(after.approvedAt ?? Date.now());
      const result = applyApproval(state, {
        pointsValue: after.pointsValue,
        approvedAt,
        timezone,
        earnedBadgeKeys,
      });

      tx.update(childRef, { ...result.next });
      tx.update(taskRef, { pointsCredited: true });
      for (const key of result.newBadgeKeys) {
        tx.set(childRef.collection('badges').doc(key), { earnedAt: approvedAt.getTime() });
      }
      return result.newBadgeKeys;
    });

    logger.info('Task approved', { taskId, newBadgeKeys });
  },
);

// ---------------------------------------------------------------------------
// Reward shop — the child asks, the server moves the points.
// ---------------------------------------------------------------------------

export const onRedemptionRequested = onDocumentCreated(
  'households/{householdId}/redemptions/{redemptionId}',
  async (event) => {
    const data = event.data?.data();
    if (!data || data.status !== 'requested') return;

    const { householdId, redemptionId } = event.params;
    const redemptionRef = db.doc(`households/${householdId}/redemptions/${redemptionId}`);
    const childRef = db.doc(`households/${householdId}/children/${data.childId}`);

    await db.runTransaction(async (tx) => {
      const childDoc = await tx.get(childRef);
      if (!childDoc.exists) {
        tx.update(redemptionRef, { status: 'declined' });
        return;
      }
      const balance = (childDoc.data()?.totalPoints as number) ?? 0;
      const cost = (data.pointCost as number) ?? 0;

      if (balance < cost) {
        // Never let a balance go negative; surface it as a state, not an error.
        tx.update(redemptionRef, { status: 'insufficient_points' });
        return;
      }
      tx.update(childRef, { totalPoints: FieldValue.increment(-cost) });
      tx.update(redemptionRef, { pointsDeducted: true });
    });
  },
);

/** Declining a request hands the points straight back. */
export const onRedemptionResolved = onDocumentUpdated(
  'households/{householdId}/redemptions/{redemptionId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status !== 'requested' || after.status !== 'declined') return;
    if (!before.pointsDeducted || after.pointsRefunded) return;

    const { householdId, redemptionId } = event.params;
    const childRef = db.doc(`households/${householdId}/children/${after.childId}`);
    const redemptionRef = db.doc(`households/${householdId}/redemptions/${redemptionId}`);

    await db.runTransaction(async (tx) => {
      const childDoc = await tx.get(childRef);
      if (!childDoc.exists) return;
      tx.update(childRef, { totalPoints: FieldValue.increment(after.pointCost ?? 0) });
      tx.update(redemptionRef, { pointsRefunded: true });
    });
  },
);

// ---------------------------------------------------------------------------
// Gemini proxy — keeps the API key off every installed copy of the extension.
// ---------------------------------------------------------------------------

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPTS: Record<string, string> = {
  suggest_tasks:
    'You help a parent write short homework and chore tasks for their child. ' +
    'Reply with 5 task titles, one per line, no numbering, no punctuation at the end. ' +
    'Each under 8 words, concrete and checkable.',
  encourage:
    'You write one short encouraging line for a child who still has tasks left ' +
    'before their sites unlock. Warm, never shaming, never sarcastic. ' +
    'One sentence, under 12 words. Reply with the sentence only.',
};

export const geminiAssist = onCall(
  { secrets: [GEMINI_API_KEY], enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');

    const kind = String(request.data?.kind ?? '');
    const system = SYSTEM_PROMPTS[kind];
    if (!system) throw new HttpsError('invalid-argument', 'Unknown assist kind.');

    // Task suggestions are a parent-only feature; encouragement is for anyone
    // signed in, including the child's anonymous account.
    if (kind === 'suggest_tasks' && request.auth.token.firebase?.sign_in_provider === 'anonymous') {
      throw new HttpsError('permission-denied', 'Parents only.');
    }

    const key = GEMINI_API_KEY.value();
    if (!key) throw new HttpsError('failed-precondition', 'GEMINI_API_KEY is not set.');

    const prompt = String(request.data?.prompt ?? '').slice(0, 500);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
        }),
      },
    );

    if (!response.ok) {
      logger.error('Gemini call failed', { status: response.status });
      throw new HttpsError('unavailable', 'Gemini is unavailable right now.');
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const lines = text
      .split('\n')
      .map((l) => l.replace(/^[\s\-*\d.)]+/, '').trim())
      .filter(Boolean);

    return { lines: kind === 'encourage' ? lines.slice(0, 1) : lines.slice(0, 5) };
  },
);
