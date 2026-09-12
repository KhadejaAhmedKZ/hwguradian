// Shared data model. Consumed by both the extension (src/) and Cloud Functions
// (functions/ — see functions/scripts/sync-shared.mjs).

export type TaskStatus = 'pending' | 'pending_approval' | 'approved';
export type ChoreRecurrence = 'daily' | 'weekdays' | 'weekly' | 'once';
export type VerdictState = 'pass' | 'needs_more' | 'unclear';

/**
 * How the gate decides to reopen blocked sites.
 *   parent_only  — only a parent approval reopens them (the strict default)
 *   agent_unlock — a 'pass' from the verifier agent reopens them immediately,
 *                  while points still wait for the parent
 */
export type GatePolicy = 'parent_only' | 'agent_unlock';
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
  gatePolicy: GatePolicy;
  /** Opt-in. When false the extension records no per-site time at all. */
  screenTimeEnabled: boolean;
  createdAt: number;
}

/**
 * A repeating chore. Chores are templates; `syncChores` materialises them into
 * dated Task documents, which is what the child actually sees and ticks off.
 */
export interface Chore {
  id: string;
  title: string;
  /** What the child is expected to do — also given to the verifier agent. */
  description: string;
  /** A child id, or 'rotate' to cycle through siblings. */
  childId: string | 'rotate';
  pointsValue: number;
  recurrence: ChoreRecurrence;
  /** For 'weekly': which days (0 = Sunday). Ignored by the other recurrences. */
  daysOfWeek: number[];
  /** When true the child must describe what they did before it can be submitted. */
  requiresEvidence: boolean;
  active: boolean;
  /** Cursor for 'rotate' assignment. */
  rotationIndex: number;
  lastGeneratedDate: string | null;
  createdAt: number;
}

/**
 * The verifier agent's reading of the child's account of a chore.
 *
 * It is explicitly NOT ground truth: the agent cannot see the room. It judges
 * whether what the child wrote actually describes the chore being finished.
 * Written only by the server — never by any client.
 */
export interface AgentVerdict {
  state: VerdictState;
  /** One line, shown to both the parent and the child. */
  reason: string;
  /** When state is 'needs_more': the specific thing still missing. */
  followUp: string | null;
  checkedAt: number;
  agentId: string;
  model: string;
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
  /** Present when this task was materialised from a repeating chore. */
  choreId?: string | null;
  /** The child's own description of what they did. */
  evidence?: string | null;
  /** Server-written. See AgentVerdict. */
  agentVerdict?: AgentVerdict | null;
  /** Rate-limit guard for the verifier agent. */
  verifyAttempts?: number;
  /** The child must describe what they did before this can be submitted. */
  requiresEvidence?: boolean;
}

/**
 * One day of screen time for one child. Opt-in per household.
 * Seconds per domain — never URLs, never page content, never titles.
 */
export interface UsageDay {
  /** Document id: YYYY-MM-DD in the household timezone. */
  day: string;
  domains: Record<string, number>;
  totalSeconds: number;
  updatedAt: number;
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
