// Sanity check of the streak and badge rules.
//
// It imports the COMPILED functions copy on purpose — that is the exact code
// that runs on the server, so this also proves shared/ mirrored correctly.
// Run via `npm run test:awards`, which builds functions first.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const { applyApproval } = require(resolve(here, '../functions/lib/shared/awards.js'));
const TZ = 'Asia/Dubai';
const at = (iso) => new Date(iso);
const base = { totalPoints: 0, currentStreak: 0, longestStreak: 0, lastCompletedDate: null, tasksApproved: 0 };
let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
};

// 1. First ever approval: streak 1, points credited, first_task badge.
let r = applyApproval(base, { pointsValue: 10, approvedAt: at('2026-09-10T14:00:00+04:00'), timezone: TZ, earnedBadgeKeys: [] });
check('first approval -> streak 1, +10, first_task',
  [r.next.currentStreak, r.next.totalPoints, r.newBadgeKeys.includes('first_task')], [1, 10, true]);

// 2. Second task the SAME day does not bump the streak.
r = applyApproval(r.next, { pointsValue: 5, approvedAt: at('2026-09-10T19:00:00+04:00'), timezone: TZ, earnedBadgeKeys: ['first_task'] });
check('same-day second task -> streak stays 1, points still add',
  [r.next.currentStreak, r.next.totalPoints, r.next.tasksApproved], [1, 15, 2]);

// 3. Next day continues the streak.
r = applyApproval(r.next, { pointsValue: 10, approvedAt: at('2026-09-11T14:00:00+04:00'), timezone: TZ, earnedBadgeKeys: ['first_task'] });
check('next day -> streak 2', r.next.currentStreak, 2);

// 4. Third consecutive day awards streak_3.
r = applyApproval(r.next, { pointsValue: 10, approvedAt: at('2026-09-12T14:00:00+04:00'), timezone: TZ, earnedBadgeKeys: ['first_task'] });
check('third day -> streak 3 + streak_3 badge',
  [r.next.currentStreak, r.newBadgeKeys.includes('streak_3')], [3, true]);

// 5. A missed day resets to 1, and (longestStreak >= 3) triggers comeback.
const afterBreak = applyApproval(r.next, { pointsValue: 10, approvedAt: at('2026-09-20T14:00:00+04:00'), timezone: TZ, earnedBadgeKeys: ['first_task','streak_3'] });
check('after an 8-day gap -> streak resets to 1, longest kept, comeback awarded',
  [afterBreak.next.currentStreak, afterBreak.next.longestStreak, afterBreak.newBadgeKeys.includes('comeback')], [1, 3, true]);

// 6. Early bird uses the household timezone, not UTC.
const early = applyApproval(base, { pointsValue: 10, approvedAt: at('2026-09-10T08:30:00+04:00'), timezone: TZ, earnedBadgeKeys: [] });
const late  = applyApproval(base, { pointsValue: 10, approvedAt: at('2026-09-10T08:30:00+04:00'), timezone: 'UTC', earnedBadgeKeys: [] });
check('early_bird 08:30 local = yes; same instant is 04:30 UTC = also yes',
  [early.newBadgeKeys.includes('early_bird'), late.newBadgeKeys.includes('early_bird')], [true, true]);
const notEarly = applyApproval(base, { pointsValue: 10, approvedAt: at('2026-09-10T13:00:00+04:00'), timezone: TZ, earnedBadgeKeys: [] });
check('early_bird 13:00 local -> not awarded', notEarly.newBadgeKeys.includes('early_bird'), false);

// 7. A day boundary that differs between UTC and the household timezone.
//    23:30 Dubai on the 10th is 19:30 UTC on the 10th; 01:00 Dubai on the 11th is 21:00 UTC on the 10th.
let s = applyApproval(base, { pointsValue: 10, approvedAt: at('2026-09-10T23:30:00+04:00'), timezone: TZ, earnedBadgeKeys: [] });
s = applyApproval(s.next, { pointsValue: 10, approvedAt: at('2026-09-11T01:00:00+04:00'), timezone: TZ, earnedBadgeKeys: ['first_task'] });
check('crossing local midnight -> streak 2 (would be 1 if computed in UTC)', s.next.currentStreak, 2);

// 8. Already-earned badges are not re-awarded.
r = applyApproval({ ...base, tasksApproved: 9, currentStreak: 2, longestStreak: 2, lastCompletedDate: '2026-09-11' },
  { pointsValue: 10, approvedAt: at('2026-09-12T10:00:00+04:00'), timezone: TZ, earnedBadgeKeys: ['first_task'] });
check('10th task on a 3rd streak day -> tasks_10 + streak_3, first_task not repeated', r.newBadgeKeys, ['streak_3', 'tasks_10']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
