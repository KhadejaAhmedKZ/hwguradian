import type { Child, Chore, EarnedBadge, Redemption, Reward, Task } from '@shared/types';

export const me: Child = {
  id: 'c1', name: 'Yusuf', avatarEmoji: '🦊', totalPoints: 145,
  currentStreak: 4, longestStreak: 9, lastCompletedDate: '2026-09-11',
  tasksApproved: 8, createdAt: 0,
};

export const sibling: Child = {
  id: 'c2', name: 'Layla', avatarEmoji: '🐼', totalPoints: 190,
  currentStreak: 2, longestStreak: 11, lastCompletedDate: '2026-09-12',
  tasksApproved: 12, createdAt: 0,
};

const task = (
  id: string, title: string, pointsValue: number, status: Task['status'],
): Task => ({
  id, childId: 'c1', title, pointsValue, status, createdAt: 0,
  submittedAt: null, approvedAt: null, flaggedRecentBlockedActivity: false,
});

export const initialTasks: Task[] = [
  task('t1', 'Finish maths worksheet', 10, 'pending'),
  task('t2', 'Read for 20 minutes', 15, 'pending'),
  { ...task('t3', 'Tidy bedroom floor', 5, 'pending'), requiresEvidence: true },
  task('t4', 'Practise spelling words', 10, 'approved'),
];

export const rewards: Reward[] = [
  { id: 'r1', title: '30 minutes of game time', pointCost: 60, active: true, createdAt: 0 },
  { id: 'r2', title: 'Pick dinner on Friday', pointCost: 120, active: true, createdAt: 0 },
  { id: 'r3', title: 'Cinema trip', pointCost: 300, active: true, createdAt: 0 },
  { id: 'r4', title: 'Stay up 30 min late', pointCost: 90, active: true, createdAt: 0 },
];

export const initialRedemptions: Redemption[] = [
  {
    id: 'x1', childId: 'c1', rewardId: 'r2', rewardTitle: 'Pick dinner on Friday',
    pointCost: 120, status: 'requested', requestedAt: Date.now(), grantedAt: null,
  },
];

export const earnedBadges: EarnedBadge[] = [
  { key: 'first_task', earnedAt: Date.now() },
  { key: 'streak_3', earnedAt: Date.now() },
  { key: 'early_bird', earnedAt: Date.now() },
];

/** A submitted chore carrying the child's note and the agent's verdict. */
export const verifiedTask: Task = {
  ...task('t9', 'Tidy bedroom floor', 5, 'pending_approval'),
  submittedAt: Date.now() - 1000 * 60 * 12,
  requiresEvidence: true,
  flaggedRecentBlockedActivity: true,
  evidence:
    'I put all my clothes in the wash basket, made the bed and moved the lego box back under the desk.',
  agentVerdict: {
    state: 'pass',
    reason: 'That covers the clothes, the bed and the floor — sounds finished.',
    followUp: null,
    checkedAt: Date.now() - 1000 * 60 * 11,
    agentId: 'chore_verifier',
    model: 'gemini-2.5-flash',
  },
};

export const demoChores: Chore[] = [
  {
    id: 'ch1', title: 'Tidy your bedroom', childId: me.id, pointsValue: 5,
    description: 'Clothes in the basket, bed made, floor clear enough to walk across.',
    recurrence: 'daily', daysOfWeek: [], requiresEvidence: true, active: true,
    rotationIndex: 0, lastGeneratedDate: null, createdAt: 0,
  },
  {
    id: 'ch2', title: 'Empty the dishwasher', childId: 'rotate', pointsValue: 8,
    description: 'Everything put away in the right cupboard, machine left empty.',
    recurrence: 'weekdays', daysOfWeek: [], requiresEvidence: true, active: true,
    rotationIndex: 1, lastGeneratedDate: null, createdAt: 0,
  },
  {
    id: 'ch3', title: 'Take the bins out', childId: sibling.id, pointsValue: 10,
    description: 'Both bins to the kerb before bedtime.',
    recurrence: 'weekly', daysOfWeek: [2, 5], requiresEvidence: false, active: true,
    rotationIndex: 0, lastGeneratedDate: null, createdAt: 0,
  },
  {
    id: 'ch4', title: 'Water the plants', childId: me.id, pointsValue: 3,
    description: '', recurrence: 'weekly', daysOfWeek: [0], requiresEvidence: false,
    active: false, rotationIndex: 0, lastGeneratedDate: null, createdAt: 0,
  },
];
