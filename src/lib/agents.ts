// Client wrapper for the text agents. The verifier is not here on purpose —
// it is called through childActions, and only ever by the child's own device.

import { httpsCallable, type Functions } from 'firebase/functions';

export type TextAgentId = 'chore_planner' | 'coach';

export async function runTextAgent(
  functions: Functions,
  agentId: TextAgentId,
  input: { prompt?: string; householdId?: string },
): Promise<string[]> {
  const callable = httpsCallable<
    { agentId: string; prompt?: string; householdId?: string },
    { lines: string[] }
  >(functions, 'runAgent');
  const result = await callable({ agentId, ...input });
  return result.data.lines ?? [];
}
