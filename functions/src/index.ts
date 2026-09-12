/**
 * HW Guardian server logic.
 *
 * Everything that touches a number a child could benefit from lives here and
 * nowhere else: points, streaks, badge awards and reward deductions. The
 * clients only ever set intent ("approved", "requested"); the numbers are
 * derived server-side by the Admin SDK, which bypasses Firestore rules.
 *
 * The agent layer lives here for the same reason — see agents/registry.ts.
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as logger from 'firebase-functions/logger';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { applyApproval, type ChildAwardState } from './shared/awards';
import type { AgentVerdict, Chore, Task, VerdictState } from './shared/types';
import { AGENTS, VERIFIER_SCHEMA, type CallerPolicy } from './agents/registry';
import { generate, MODEL } from './agents/gemini';
import { syncChoresForHousehold } from './chores';

initializeApp();
const db = getFirestore();

// Keep this in sync with VITE_FUNCTIONS_REGION in .env.local.
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const MAX_VERIFY_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// Shared auth helpers
// ---------------------------------------------------------------------------

function requireAuth(request: CallableRequest): string {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return request.auth.uid;
}

function isAnonymous(request: CallableRequest): boolean {
  return request.auth?.token.firebase?.sign_in_provider === 'anonymous';
}

async function assertParentOf(uid: string, householdId: string): Promise<void> {
  const snap = await db.doc(`households/${householdId}`).get();
  if (!snap.exists || snap.data()?.parentUid !== uid) {
    throw new HttpsError('permission-denied', 'Not your household.');
  }
}

async function childLinkOf(uid: string): Promise<{ householdId: string; childId: string }> {
  const snap = await db.doc(`childLinks/${uid}`).get();
  const data = snap.data();
  if (!snap.exists || !data?.householdId || !data?.childId) {
    throw new HttpsError('permission-denied', 'This device is not paired to a child.');
  }
  return { householdId: data.householdId, childId: data.childId };
}

async function enforceCallerPolicy(
  request: CallableRequest,
  policy: CallerPolicy,
  householdId?: string,
): Promise<void> {
  const uid = requireAuth(request);
  if (policy === 'any') return;
  if (policy === 'parent') {
    if (isAnonymous(request)) throw new HttpsError('permission-denied', 'Parents only.');
    if (householdId) await assertParentOf(uid, householdId);
    return;
  }
  // policy === 'child'
  await childLinkOf(uid);
}

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
// Chores
// ---------------------------------------------------------------------------

/**
 * Materialise today's chores. Called by the parent dashboard and the child's
 * popup when they open, so no scheduler is required for the common case.
 */
export const syncChores = onCall(async (request) => {
  const uid = requireAuth(request);
  const householdId = String(request.data?.householdId ?? '');
  if (!householdId) throw new HttpsError('invalid-argument', 'householdId is required.');

  if (isAnonymous(request)) {
    const link = await childLinkOf(uid);
    if (link.householdId !== householdId) {
      throw new HttpsError('permission-denied', 'Not your household.');
    }
  } else {
    await assertParentOf(uid, householdId);
  }

  const created = await syncChoresForHousehold(householdId);
  return { created };
});

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

/**
 * The chore verifier.
 *
 * The child submits what they did; this reads it against the chore definition
 * and writes a verdict onto the task. A 'pass' can reopen blocked sites when the
 * household's gate policy allows it — it can never approve the task or move a
 * single point. That stays with the parent.
 */
export const verifyChore = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
  const uid = requireAuth(request);
  const link = await childLinkOf(uid);
  const taskId = String(request.data?.taskId ?? '');
  const evidence = String(request.data?.evidence ?? '').slice(0, 1200).trim();
  if (!taskId) throw new HttpsError('invalid-argument', 'taskId is required.');

  const taskRef = db.doc(`households/${link.householdId}/tasks/${taskId}`);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) throw new HttpsError('not-found', 'No such task.');

  const task = taskSnap.data() as Task;
  if (task.childId !== link.childId) {
    throw new HttpsError('permission-denied', 'Not your task.');
  }
  if (task.status === 'approved') {
    throw new HttpsError('failed-precondition', 'This one is already approved.');
  }
  if ((task.verifyAttempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    throw new HttpsError('resource-exhausted', 'Ask a parent to take a look at this one.');
  }

  let choreDescription = '';
  if (task.choreId) {
    const choreSnap = await db
      .doc(`households/${link.householdId}/chores/${task.choreId}`)
      .get();
    choreDescription = ((choreSnap.data() as Chore | undefined)?.description ?? '').slice(0, 800);
  }

  const agent = AGENTS.chore_verifier!;
  let verdict: AgentVerdict;

  try {
    const raw = await generate({
      apiKey: GEMINI_API_KEY.value(),
      system: agent.system,
      user: [
        `Chore: ${task.title}`,
        choreDescription ? `What counts as done: ${choreDescription}` : '',
        `What the child wrote: ${evidence || '(they wrote nothing)'}`,
      ]
        .filter(Boolean)
        .join('\n'),
      responseSchema: VERIFIER_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.2,
    });

    const parsed = JSON.parse(raw) as { state?: string; reason?: string; followUp?: string };
    const state: VerdictState =
      parsed.state === 'pass' || parsed.state === 'needs_more' ? parsed.state : 'unclear';

    verdict = {
      state,
      reason: (parsed.reason ?? '').slice(0, 300) || 'Thanks — sending this to your parent.',
      followUp: parsed.followUp ? parsed.followUp.slice(0, 300) : null,
      checkedAt: Date.now(),
      agentId: agent.id,
      model: MODEL,
    };
  } catch (error) {
    // A model outage must never block a child. Fall through to the parent.
    logger.error('Verifier failed', { taskId, error: String(error) });
    verdict = {
      state: 'unclear',
      reason: "I couldn't check this one — your parent will take a look.",
      followUp: null,
      checkedAt: Date.now(),
      agentId: agent.id,
      model: MODEL,
    };
  }

  await taskRef.update({
    evidence: evidence || null,
    agentVerdict: verdict,
    verifyAttempts: FieldValue.increment(1),
  });

  return { verdict };
});

/** Text-only agents: the chore planner and the encouragement coach. */
export const runAgent = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
  const agentId = String(request.data?.agentId ?? '');
  const agent = AGENTS[agentId];
  if (!agent || agentId === 'chore_verifier') {
    throw new HttpsError('invalid-argument', 'Unknown agent.');
  }

  await enforceCallerPolicy(request, agent.caller, request.data?.householdId);

  const prompt = String(request.data?.prompt ?? '').slice(0, 800);
  const text = await generate({
    apiKey: GEMINI_API_KEY.value(),
    system: agent.system,
    user: prompt,
    temperature: 0.9,
  });

  const lines = text
    .split('\n')
    .map((l) => l.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter(Boolean);

  return { lines: agentId === 'coach' ? lines.slice(0, 1) : lines.slice(0, 5) };
});
