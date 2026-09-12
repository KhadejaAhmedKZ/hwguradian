// Pure, dependency-free award logic: points, streaks and badges.
//
// This module is the single source of truth and it runs SERVER-SIDE, inside the
// `onTaskApproved` Firestore trigger (functions/src/index.ts). The extension
// imports it only to render previews ("2 more for Week Warrior") — a client can
// never write the values it produces, because Firestore rules forbid children
// from touching points/streak fields at all.

import { BADGES } from './badges';

/** YYYY-MM-DD in the given IANA timezone. */
export function dayKey(at: Date, timezone: string): string {
  // en-CA formats as YYYY-MM-DD, which sorts and compares as a string.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Hour of day (0-23) in the given IANA timezone. */
export function hourInZone(at: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '0';
  return Number(hour) % 24;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function previousDay(key: string): string {
  const dt = parseDayKey(key);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. Negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const ms = parseDayKey(to).getTime() - parseDayKey(from).getTime();
  return Math.round(ms / 86_400_000);
}

export interface ChildAwardState {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  tasksApproved: number;
}

export interface ApprovalInput {
  pointsValue: number;
  approvedAt: Date;
  timezone: string;
  /** Badge keys the child already holds, so we only award each one once. */
  earnedBadgeKeys: string[];
}

export interface ApprovalResult {
  next: ChildAwardState;
  newBadgeKeys: string[];
  /** True when this approval extended or restarted the streak (vs. same-day). */
  streakChanged: boolean;
}

/**
 * Apply one approved task to a child's state.
 *
 * Streak rules:
 *   - already completed today  → streak unchanged (multiple tasks in one day
 *     don't stack)
 *   - completed yesterday      → streak + 1
 *   - anything else            → streak resets to 1
 */
export function applyApproval(state: ChildAwardState, input: ApprovalInput): ApprovalResult {
  const today = dayKey(input.approvedAt, input.timezone);
  const last = state.lastCompletedDate;

  let currentStreak = state.currentStreak;
  let streakChanged = false;
  let isComeback = false;

  if (last === today) {
    // Second (or third...) task approved today — streak already counted.
    if (currentStreak < 1) {
      currentStreak = 1;
      streakChanged = true;
    }
  } else if (last && last === previousDay(today)) {
    currentStreak = currentStreak + 1;
    streakChanged = true;
  } else {
    // A gap, or the very first approval ever.
    if (last && daysBetween(last, today) >= 2 && state.longestStreak >= 3) {
      isComeback = true;
    }
    currentStreak = 1;
    streakChanged = true;
  }

  const next: ChildAwardState = {
    totalPoints: state.totalPoints + input.pointsValue,
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastCompletedDate: today,
    tasksApproved: state.tasksApproved + 1,
  };

  const earned = new Set(input.earnedBadgeKeys);
  const newBadgeKeys: string[] = [];
  const award = (key: string, won: boolean) => {
    if (won && !earned.has(key)) newBadgeKeys.push(key);
  };

  award('first_task', next.tasksApproved >= 1);
  award('streak_3', next.currentStreak >= 3);
  award('streak_7', next.currentStreak >= 7);
  award('streak_30', next.currentStreak >= 30);
  award('tasks_10', next.tasksApproved >= 10);
  award('tasks_50', next.tasksApproved >= 50);
  award('early_bird', hourInZone(input.approvedAt, input.timezone) < 9);
  award('comeback', isComeback);

  return { next, newBadgeKeys, streakChanged };
}

/** The nearest unearned badge with a measurable target, for the progress bar. */
export function nextBadgeProgress(
  state: Pick<ChildAwardState, 'tasksApproved' | 'currentStreak'>,
  earnedBadgeKeys: string[],
) {
  const earned = new Set(earnedBadgeKeys);
  const candidates = BADGES.filter((b) => b.progress && !earned.has(b.key)).map((b) => {
    const target = b.progress!.target;
    const value = b.progress!.metric === 'tasksApproved' ? state.tasksApproved : state.currentStreak;
    return { badge: b, value: Math.min(value, target), target, remaining: target - value };
  });
  candidates.sort((a, b) => a.remaining - b.remaining);
  return candidates[0] ?? null;
}
