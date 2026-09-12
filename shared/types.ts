// Shared data model. Consumed by both the extension (src/) and Cloud Functions
// (functions/ — see functions/scripts/sync-shared.mjs).

export type TaskStatus = 'pending' | 'pending_approval' | 'approved';
export type RedemptionStatus = 'requested' | 'granted' | 'declined' | 'insufficient_points';
export type LeaderboardMetric = 'points' | 'streak';

export interface Household {
  id: string;
  name: string;
  parentUid: string;
  /** Bare hostnames, e.g. "youtube.com". Subdomains are matched automatically. */
  blockedDomains: string[];
  leaderboardMetric: LeaderboardMetric;
  /** IANA timezone used for "today", streak boundaries and the early-bird badge. */
  timezone: string;
  createdAt: number;
}

export interface Child {
  id: string;
  name: string;
  avatarEmoji: string;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  /** Day key (YYYY-MM-DD in the household timezone) of the last approved task. */
  lastCompletedDate: string | null;
  tasksApproved: number;
  createdAt: number;
}

export interface Task {
  id: string;
  childId: string;
  title: string;
  pointsValue: number;
  status: TaskStatus;
  createdAt: number;
  submittedAt: number | null;
  approvedAt: number | null;
  /**
   * The single activity signal this product collects. Set at the moment the
   * child taps "mark done", if the active tab (or a tab focused in the last
   * 5 minutes) was on a blocked domain. Shown to the parent as a heads-up only.
   * Never shown to the child, never auto-rejects, never affects points.
   */
  flaggedRecentBlockedActivity: boolean;
  /** Set by the Cloud Function once points/streak/badges have been applied. */
  pointsCredited?: boolean;
}

export interface Reward {
  id: string;
  title: string;
  pointCost: number;
  active: boolean;
  createdAt: number;
}

export interface Redemption {
  id: string;
  childId: string;
  rewardId: string;
  rewardTitle: string;
  pointCost: number;
  status: RedemptionStatus;
  requestedAt: number;
  grantedAt: number | null;
}

export interface EarnedBadge {
  key: string;
  earnedAt: number;
}

/** Written once at pairing time; maps an anonymous auth uid to one child. */
export interface ChildLink {
  householdId: string;
  childId: string;
  pairingCode: string;
  createdAt: number;
}
