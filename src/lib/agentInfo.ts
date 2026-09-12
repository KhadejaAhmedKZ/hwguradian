// Display metadata for the agents, mirroring functions/src/agents/registry.ts.
// Kept here rather than imported so the extension bundle carries no prompts.

export interface AgentInfo {
  id: string;
  icon: string;
  label: string;
  description: string;
  caller: 'parent' | 'child' | 'anyone';
}

export const AGENT_INFO: AgentInfo[] = [
  {
    id: 'chore_verifier',
    icon: '🤖',
    label: 'Chore verifier',
    description:
      "Reads the child's written note about a finished chore and decides whether it describes " +
      'the chore being done. Can reopen blocked sites; can never award points.',
    caller: 'child',
  },
  {
    id: 'chore_planner',
    icon: '🗒️',
    label: 'Chore planner',
    description: 'Suggests age-appropriate chores and homework tasks for you to review and edit.',
    caller: 'parent',
  },
  {
    id: 'coach',
    icon: '💛',
    label: 'Encouragement coach',
    description: 'Writes the one encouraging line on the blocked page. Sees no data about the child.',
    caller: 'anyone',
  },
];
