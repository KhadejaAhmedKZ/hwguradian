/**
 * The agent layer.
 *
 * Every agent is a named prompt with a declared caller policy and a typed
 * result. They all run here, on the server, for two reasons: the API key stays
 * off the client, and — more importantly — an agent's output is only
 * trustworthy if the client cannot author it. The verifier in particular writes
 * to a task field that Firestore rules make unwritable by anyone else.
 *
 * What agents may NOT do, by construction:
 *   - approve a task (only a parent sets status 'approved')
 *   - award, deduct or modify points, streaks or badges
 *   - see anything about browsing beyond what the parent already sees
 */

export type CallerPolicy = 'parent' | 'child' | 'any';

export interface AgentDef {
  id: string;
  /** Shown in the parent's Agents settings panel. */
  label: string;
  description: string;
  caller: CallerPolicy;
  system: string;
}

export const VERIFIER_SCHEMA = {
  type: 'object',
  properties: {
    state: { type: 'string', enum: ['pass', 'needs_more', 'unclear'] },
    reason: { type: 'string' },
    followUp: { type: 'string' },
  },
  required: ['state', 'reason'],
} as const;

export const AGENTS: Record<string, AgentDef> = {
  chore_verifier: {
    id: 'chore_verifier',
    label: 'Chore verifier',
    description:
      "Reads the child's description of a finished chore and decides whether it " +
      'actually describes the chore being done. Can reopen blocked sites; can never award points.',
    caller: 'child',
    system: [
      'You check whether a child\'s description of a chore they say they finished',
      'actually describes that chore being completed.',
      '',
      'You CANNOT see the room, the homework or the child. You are judging the',
      'account they wrote, not the world. Say so in your own head and never claim',
      'to know what really happened.',
      '',
      'Return "pass" when the description is specific enough that a reasonable',
      'parent reading it would believe the chore was done. Be generous: children',
      'write briefly, and a short but concrete answer is a good answer.',
      '',
      'Return "needs_more" when the description is empty, generic ("did it",',
      '"finished"), or clearly misses a part of the chore. Put ONE specific,',
      'friendly follow-up question in followUp — something they can answer in a',
      'sentence.',
      '',
      'Return "unclear" only when the description is about something else entirely.',
      '',
      'Tone rules, always: warm, plain, never sarcastic, never accusing them of',
      'lying, never shaming. "reason" is one short sentence the child will read.',
      'Never mention points, and never tell the child whether sites will unlock.',
    ].join('\n'),
  },

  chore_planner: {
    id: 'chore_planner',
    label: 'Chore planner',
    description: 'Suggests age-appropriate chores and homework tasks for a parent to review.',
    caller: 'parent',
    system: [
      'You help a parent write short homework and chore tasks for their child.',
      'Reply with 5 task titles, one per line, no numbering, no trailing punctuation.',
      'Each under 8 words, concrete and checkable.',
    ].join('\n'),
  },

  coach: {
    id: 'coach',
    label: 'Encouragement coach',
    description: 'Writes the one-line encouragement on the blocked page.',
    caller: 'any',
    system: [
      'You write one short encouraging line for a child who still has tasks left',
      'before their sites unlock. Warm, never shaming, never sarcastic.',
      'One sentence, under 12 words. Reply with the sentence only.',
    ].join('\n'),
  },
};
