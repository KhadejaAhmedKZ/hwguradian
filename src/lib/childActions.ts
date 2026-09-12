// The only writes a child is allowed to make. Both are shaped to match the
// Firestore rules exactly — anything else is rejected server-side.

import { addDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { childDb, childFunctions } from '../firebase';
import { redemptionsCol, taskDoc } from './paths';
import { sendToBackground } from './messages';
import type { AgentVerdict, Child, Reward, Task } from '@shared/types';

/**
 * Mark a task done.
 *
 * Before flipping the status we ask the background worker one yes/no question:
 * was the active tab (or a tab focused in the last 5 minutes) on a blocked
 * domain? The answer becomes a single boolean on this task, shown only to the
 * parent.
 */
export async function markTaskDone(householdId: string, task: Task): Promise<void> {
  let flagged = false;
  const response = await sendToBackground({ type: 'CHECK_RECENT_BLOCKED_ACTIVITY' });
  if (response.type === 'RECENT_BLOCKED_ACTIVITY') flagged = response.flagged;

  await updateDoc(taskDoc(childDb(), householdId, task.id), {
    status: 'pending_approval',
    flaggedRecentBlockedActivity: flagged,
    submittedAt: Date.now(),
  });
}

/**
 * Hand the child's description to the verifier agent.
 *
 * The evidence text and the verdict are both written by the server — the child
 * client cannot author either, which is the only reason the verdict is worth
 * anything. A 'pass' may reopen blocked sites; it never awards a point.
 */
export async function submitForVerification(
  taskId: string,
  evidence: string,
): Promise<AgentVerdict> {
  const callable = httpsCallable<{ taskId: string; evidence: string }, { verdict: AgentVerdict }>(
    childFunctions(),
    'verifyChore',
  );
  const result = await callable({ taskId, evidence });
  await sendToBackground({ type: 'RESYNC' });
  return result.data.verdict;
}

/**
 * Request a reward. Points are deducted server-side by the
 * `onRedemptionRequested` trigger — the child client cannot touch points.
 */
export async function requestReward(
  householdId: string,
  child: Child,
  reward: Reward,
): Promise<void> {
  await addDoc(redemptionsCol(childDb(), householdId), {
    childId: child.id,
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointCost: reward.pointCost,
    status: 'requested',
    requestedAt: Date.now(),
    grantedAt: null,
  });
}
