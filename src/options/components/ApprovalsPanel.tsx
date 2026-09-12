import type { Child, Task } from '@shared/types';
import { approveTask, sendTaskBack } from '../../lib/parentActions';

/**
 * The approval queue. Note the treatment of `flaggedRecentBlockedActivity`:
 * it is a neutral heads-up line, it never blocks the approve button, it never
 * changes the point value, and nothing about it is shown to the child.
 */
export function ApprovalsPanel({
  hid,
  childrenList,
  tasks,
}: {
  hid: string;
  childrenList: Child[];
  tasks: Task[];
}) {
  const queue = tasks.filter((t) => t.status === 'pending_approval');
  const nameOf = (id: string) => childrenList.find((c) => c.id === id);

  if (queue.length === 0) {
    return (
      <div className="card panel center-text">
        <div style={{ fontSize: 30 }}>☕</div>
        <h2>Nothing waiting</h2>
        <p className="muted tiny">Tasks marked done will appear here for approval.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {queue.map((task) => {
        const child = nameOf(task.childId);
        return (
          <section key={task.id} className="card panel approval">
            <div className="spread">
              <div>
                <div className="row">
                  <span style={{ fontSize: 22 }}>{child?.avatarEmoji ?? '🙂'}</span>
                  <div>
                    <h2 style={{ fontSize: 15 }}>{task.title}</h2>
                    <div className="tiny muted">
                      {child?.name ?? 'Child'} · {task.pointsValue} pts ·{' '}
                      {task.submittedAt
                        ? `marked done ${new Date(task.submittedAt).toLocaleString()}`
                        : 'marked done'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="row">
                <button className="ghost" onClick={() => void sendTaskBack(hid, task.id)}>
                  Send back
                </button>
                <button onClick={() => void approveTask(hid, task.id)}>
                  Approve · +{task.pointsValue}
                </button>
              </div>
            </div>

            {task.evidence && (
              <div className="evidence-quote">
                <div className="who">{child?.name ?? 'They'} wrote</div>
                {task.evidence}
              </div>
            )}

            {task.agentVerdict && (
              <div className={`verdict-line ${task.agentVerdict.state}`}>
                <span aria-hidden="true">
                  {task.agentVerdict.state === 'pass'
                    ? '🤖'
                    : task.agentVerdict.state === 'needs_more'
                      ? '💬'
                      : '🤔'}
                </span>
                <div>
                  <strong>Verifier agent:</strong> {task.agentVerdict.reason}
                  <div className="tiny muted" style={{ marginTop: 3 }}>
                    It read the note above, not the room — it cannot confirm the chore actually
                    happened. Points are still yours to give.
                  </div>
                </div>
              </div>
            )}

            {task.flaggedRecentBlockedActivity && (
              <div className="heads-up">
                <span aria-hidden="true">👀</span>
                <div>
                  <strong>Heads-up:</strong> was on a blocked site just before marking this done.
                  <div className="tiny muted">
                    Context only — your call. Nothing is deducted and {child?.name ?? 'your child'}{' '}
                    cannot see this.
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
