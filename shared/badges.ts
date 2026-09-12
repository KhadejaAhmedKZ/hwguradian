// Badge catalog. Display metadata lives here; the award rules live in awards.ts
// so the Cloud Function and the UI can never disagree about what counts.

export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  /** Child-facing hint shown on the greyed-out silhouette. */
  criteria: string;
  /** Used for the "progress to next badge" bar. */
  progress?: { metric: 'tasksApproved' | 'currentStreak'; target: number };
}

export const BADGES: BadgeDef[] = [
  {
    key: 'first_task',
    name: 'First Step',
    description: 'Your very first approved task.',
    icon: '🌱',
    criteria: 'Finish 1 task',
    progress: { metric: 'tasksApproved', target: 1 },
  },
  {
    key: 'streak_3',
    name: 'Three in a Row',
    description: 'Tasks approved 3 days running.',
    icon: '🔥',
    criteria: '3-day streak',
    progress: { metric: 'currentStreak', target: 3 },
  },
  {
    key: 'streak_7',
    name: 'Week Warrior',
    description: 'A full week of approved tasks.',
    icon: '⚡',
    criteria: '7-day streak',
    progress: { metric: 'currentStreak', target: 7 },
  },
  {
    key: 'streak_30',
    name: 'Month of Momentum',
    description: 'Thirty days in a row. Serious.',
    icon: '🏔️',
    criteria: '30-day streak',
    progress: { metric: 'currentStreak', target: 30 },
  },
  {
    key: 'tasks_10',
    name: 'Ten Done',
    description: '10 tasks approved all-time.',
    icon: '⭐',
    criteria: 'Finish 10 tasks',
    progress: { metric: 'tasksApproved', target: 10 },
  },
  {
    key: 'tasks_50',
    name: 'Fifty Club',
    description: '50 tasks approved all-time.',
    icon: '🏆',
    criteria: 'Finish 50 tasks',
    progress: { metric: 'tasksApproved', target: 50 },
  },
  {
    key: 'early_bird',
    name: 'Early Bird',
    description: 'A task approved before 9am.',
    icon: '🌅',
    criteria: 'Get a task approved before 9am',
  },
  {
    key: 'comeback',
    name: 'Comeback',
    description: 'Started a new streak after time away.',
    icon: '💫',
    criteria: 'Start again after a break',
  },
];

export const BADGE_BY_KEY: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.key, b]),
);
