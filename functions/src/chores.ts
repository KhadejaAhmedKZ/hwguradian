/**
 * Chore → task materialisation.
 *
 * Chores are templates ("tidy your room, every school day"). This turns the ones
 * that are due into dated Task documents, which is what the child actually sees.
 * The task id is derived from chore + day, so running this twice in one day is a
 * no-op rather than a duplicate.
 */

import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { assigneeFor, choreTaskId, isChoreDue } from './shared/chores';
import { dayKey } from './shared/awards';
import type { Chore } from './shared/types';

export async function syncChoresForHousehold(householdId: string): Promise<number> {
  const db = getFirestore();
  const householdRef = db.doc(`households/${householdId}`);
  const householdSnap = await householdRef.get();
  if (!householdSnap.exists) return 0;

  const timezone = (householdSnap.data()?.timezone as string) || 'UTC';
  const today = dayKey(new Date(), timezone);

  const [choreSnap, childrenSnap] = await Promise.all([
    householdRef.collection('chores').where('active', '==', true).get(),
    householdRef.collection('children').orderBy('createdAt').get(),
  ]);

  const childIds = childrenSnap.docs.map((d) => d.id);
  if (childIds.length === 0) return 0;

  // Work out what is due, then check what already exists. Writing a task that
  // is already there would reset a chore the child has since submitted back to
  // 'pending' — the deterministic id makes the collision certain, not unlikely.
  const due: { chore: Chore; choreRef: FirebaseFirestore.DocumentReference; childId: string; taskId: string }[] = [];
  for (const doc of choreSnap.docs) {
    const chore = { id: doc.id, ...(doc.data() as Omit<Chore, 'id'>) };
    if (!isChoreDue(chore, today)) continue;
    const childId = assigneeFor(chore, childIds);
    if (!childId) continue;
    due.push({ chore, choreRef: doc.ref, childId, taskId: choreTaskId(chore.id, today) });
  }
  if (due.length === 0) return 0;

  const existing = await db.getAll(
    ...due.map((d) => householdRef.collection('tasks').doc(d.taskId)),
  );
  const alreadyThere = new Set(
    existing.filter((snap) => snap.exists).map((snap) => snap.id),
  );

  let created = 0;
  const batch = db.batch();

  for (const { chore, choreRef, childId, taskId } of due) {
    if (alreadyThere.has(taskId)) {
      // Nothing to create, but record that today has been handled.
      if (chore.lastGeneratedDate !== today) {
        batch.update(choreRef, { lastGeneratedDate: today });
      }
      continue;
    }

    batch.create(
      householdRef.collection('tasks').doc(taskId),
      {
        childId,
        title: chore.title,
        pointsValue: chore.pointsValue,
        status: 'pending',
        createdAt: Date.now(),
        submittedAt: null,
        approvedAt: null,
        flaggedRecentBlockedActivity: false,
        pointsCredited: false,
        choreId: chore.id,
        evidence: null,
        agentVerdict: null,
        verifyAttempts: 0,
        requiresEvidence: chore.requiresEvidence === true,
      },
    );

    batch.update(choreRef, {
      lastGeneratedDate: today,
      rotationIndex: chore.childId === 'rotate' ? (chore.rotationIndex ?? 0) + 1 : (chore.rotationIndex ?? 0),
    });
    created += 1;
  }

  try {
    await batch.commit();
  } catch (error) {
    // batch.create() throws ALREADY_EXISTS if two syncs raced us between the
    // read above and here. Losing that race is the correct outcome: the task
    // exists, which is all we wanted.
    logger.info('Chore sync raced another run', { householdId, today, error: String(error) });
    return 0;
  }
  if (created > 0) logger.info('Chores materialised', { householdId, today, created });
  return created;
}
