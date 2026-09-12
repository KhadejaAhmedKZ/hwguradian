// Chore → dated task materialisation. Pure functions, shared with the server.

import type { Chore } from './types';

function dayOfWeek(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Is this chore due on the given day (YYYY-MM-DD in the household timezone)? */
export function isChoreDue(chore: Chore, dayKey: string): boolean {
  if (!chore.active) return false;
  switch (chore.recurrence) {
    case 'daily':
      return true;
    case 'weekdays': {
      const dow = dayOfWeek(dayKey);
      return dow >= 1 && dow <= 5;
    }
    case 'weekly':
      return chore.daysOfWeek.includes(dayOfWeek(dayKey));
    case 'once':
      return chore.lastGeneratedDate === null;
    default:
      return false;
  }
}

/**
 * Deterministic task id. Generating twice for the same chore and day writes the
 * same document, so a double-run cannot produce duplicate chores for the child.
 */
export function choreTaskId(choreId: string, dayKey: string): string {
  return `chore_${choreId}_${dayKey}`;
}

/** Which child a chore falls to on a given generation, honouring 'rotate'. */
export function assigneeFor(chore: Chore, childIds: string[]): string | null {
  if (chore.childId !== 'rotate') {
    return childIds.includes(chore.childId) ? chore.childId : null;
  }
  if (childIds.length === 0) return null;
  const index = ((chore.rotationIndex % childIds.length) + childIds.length) % childIds.length;
  return childIds[index] ?? null;
}

export const RECURRENCE_LABEL: Record<Chore['recurrence'], string> = {
  daily: 'Every day',
  weekdays: 'School days (Mon–Fri)',
  weekly: 'Chosen days',
  once: 'One-off',
};

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
