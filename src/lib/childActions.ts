// The only two writes a child is allowed to make. Both are shaped to match the
// Firestore rules exactly — anything else is rejected server-side.

import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { childDb } from '../firebase';
import { redemptionsCol, taskDoc } from './paths';
import { sendToBackground } from './messages';
import type { Child, Reward, Task } from '@shared/types';

/**
 * Mark a task done.
 *
 * Before flipping the status we ask the background worker one yes/no question:
 * was the active tab (or a tab focused in the last 5 minutes) on a blocked
 * domain? The answer becomes a single boolean on this task, shown only to the
 * parent. Nothing else about browsing is read, sent or stored.
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

export { serverTimestamp };
