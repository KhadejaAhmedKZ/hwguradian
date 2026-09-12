import { useState } from 'react';
import type { AgentVerdict, GatePolicy, Task } from '@shared/types';
import { Confetti } from './Confetti';

interface Props {
  tasks: Task[];
  gatePolicy: GatePolicy;
  onMarkDone: (task: Task) => Promise<void>;
  onVerify: (task: Task, evidence: string) => Promise<AgentVerdict>;
}

export function TaskList({ tasks, gatePolicy, onMarkDone, onVerify }: Props) {
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const open = tasks.filter((t) => t.status !== 'approved');
  const doneToday = tasks.filter((t) => t.status === 'approved').length;

  if (open.length === 0) {
    return (
      <div className="empty card animate-in">
        <div className="empty-emoji">🎉</div>
        <strong>All clear!</strong>
        <p className="muted tiny">
          {doneToday > 0 ? 'Everything is approved. Enjoy your break.' : 'No tasks right now.'}
        </p>
      </div>
    );
  }

  const celebrate = (id: string) => {
    setCelebrating(id);
    window.setTimeout(() => setCelebrating((c) => (c === id ? null : c)), 900);
  };

  const quickDone = async (task: Task) => {
    setBusy(task.id);
    setError(null);
    celebrate(task.id);
    try {
      await onMarkDone(task);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sendForCheck = async (task: Task) => {
    const evidence = (draft[task.id] ?? '').trim();
    if (!evidence) {
      setError('Tell the checker what you did — a sentence is plenty.');
      return;
    }
    setBusy(task.id);
    setError(null);
    try {
      // Flip the status first (the child's own write), then hand the text to
      // the agent, which runs on the server and writes the verdict itself.
      if (task.status === 'pending') await onMarkDone(task);
      const verdict = await onVerify(task, evidence);
      if (verdict.state === 'pass') {
        celebrate(task.id);
        setOpenPanel(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {error && <div className="notice warm tiny">{error}</div>}
      <ul className="task-list">
        {open.map((task) => {
          const waiting = task.status === 'pending_approval';
          const verdict = task.agentVerdict ?? null;
          const needsMore = waiting && verdict?.state === 'needs_more';
          const passed = waiting && verdict?.state === 'pass';
          const panelOpen = openPanel === task.id;
          const attemptsLeft = 5 - (task.verifyAttempts ?? 0);

          return (
            <li
              key={task.id}
              className={`task card animate-in${waiting ? ' waiting' : ''}${needsMore ? ' nudge' : ''}${passed ? ' passed' : ''}`}
            >
              <div className="task-row">
                <div className="task-main">
                  <div className="task-title">{task.title}</div>
                  <div className="row tiny muted task-pills">
                    <span className="pill brand">+{task.pointsValue} pts</span>
                    {passed && (
                      <span className="pill good">
                        {gatePolicy === 'agent_unlock' ? '✅ Checked — sites open' : '✅ Checked'}
                      </span>
                    )}
                    {waiting && !passed && !needsMore && (
                      <span className="pill warm">⏳ Waiting for approval</span>
                    )}
                    {needsMore && <span className="pill sky">💬 One more thing</span>}
                    {!waiting && task.requiresEvidence && (
                      <span className="pill">✍️ Needs a note</span>
                    )}
                  </div>
                </div>

                {!waiting && !task.requiresEvidence && (
                  <div className="task-action">
                    {celebrating === task.id && <Confetti />}
                    <button
                      className={`check-btn${celebrating === task.id ? ' popped' : ''}`}
                      disabled={busy === task.id}
                      onClick={() => void quickDone(task)}
                      aria-label={`Mark "${task.title}" done`}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          d="M5 12.5l4.2 4.2L19 7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {!waiting && task.requiresEvidence && !panelOpen && (
                  <div className="task-action">
                    {celebrating === task.id && <Confetti />}
                    <button className="small" onClick={() => setOpenPanel(task.id)}>
                      I did it
                    </button>
                  </div>
                )}

                {needsMore && !panelOpen && (
                  <button className="ghost small" onClick={() => setOpenPanel(task.id)}>
                    Add more
                  </button>
                )}
              </div>

              {verdict && (verdict.state !== 'pass' || panelOpen) && (
                <div className={`verdict ${verdict.state}`}>
                  <span aria-hidden="true">{verdict.state === 'needs_more' ? '💬' : '🤔'}</span>
                  <div>
                    <div>{verdict.reason}</div>
                    {verdict.followUp && <div className="verdict-follow">{verdict.followUp}</div>}
                  </div>
                </div>
              )}

              {panelOpen && (
                <div className="evidence animate-in">
                  <label htmlFor={`ev-${task.id}`}>What did you do?</label>
                  <textarea
                    id={`ev-${task.id}`}
                    value={draft[task.id] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [task.id]: e.target.value }))}
                    placeholder="I put all the clothes in the basket and made my bed."
                    maxLength={600}
                  />
                  <div className="spread">
                    <span className="tiny muted">
                      {attemptsLeft > 0
                        ? `${attemptsLeft} check${attemptsLeft === 1 ? '' : 's'} left`
                        : 'A parent will look at this one'}
                    </span>
                    <div className="row">
                      <button className="ghost small" onClick={() => setOpenPanel(null)}>
                        Cancel
                      </button>
                      <button
                        className="small"
                        disabled={busy === task.id || attemptsLeft <= 0}
                        onClick={() => void sendForCheck(task)}
                      >
                        {busy === task.id ? 'Checking…' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
