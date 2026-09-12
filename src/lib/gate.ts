import type { GatePolicy, Task } from '@shared/types';

/**
 * Does this task hold the gate closed?
 *
 * parent_only  — anything not yet approved blocks.
 * agent_unlock — a submitted task whose verifier verdict is 'pass' stops
 *                blocking straight away. The task still sits in the parent's
 *                queue, and no points move until the parent approves it: the
 *                agent can reopen a site, never pay out.
 */
export function isTaskBlocking(task: Task, policy: GatePolicy): boolean {
  if (task.status === 'approved') return false;
  if (task.status === 'pending') return true;
  // pending_approval
  if (policy === 'agent_unlock') return task.agentVerdict?.state !== 'pass';
  return true;
}
