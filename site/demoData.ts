import type { Child, EarnedBadge, Redemption, Reward, Task } from '@shared/types';

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
  task('t3', 'Tidy bedroom floor', 5, 'pending_approval'),
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
