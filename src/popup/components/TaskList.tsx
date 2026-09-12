import { useState } from 'react';
import type { Task } from '@shared/types';
import { Confetti } from './Confetti';

interface Props {
  tasks: Task[];
  onMarkDone: (task: Task) => Promise<void>;
}

export function TaskList({ tasks, onMarkDone }: Props) {
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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

  const handle = async (task: Task) => {
    setBusy(task.id);
    setCelebrating(task.id);
    try {
      await onMarkDone(task);
    } finally {
      setBusy(null);
      window.setTimeout(() => setCelebrating((c) => (c === task.id ? null : c)), 900);
    }
  };

  return (
    <ul className="task-list">
      {open.map((task) => {
        const waiting = task.status === 'pending_approval';
        return (
          <li key={task.id} className={`task card animate-in${waiting ? ' waiting' : ''}`}>
            <div className="task-main">
              <div className="task-title">{task.title}</div>
              <div className="row tiny muted" style={{ gap: 6 }}>
                <span className="pill brand">+{task.pointsValue} pts</span>
                {waiting && <span className="pill warm">⏳ Waiting for approval</span>}
              </div>
            </div>
            {!waiting && (
              <div className="task-action">
                {celebrating === task.id && <Confetti />}
                <button
                  className={`check-btn${celebrating === task.id ? ' popped' : ''}`}
                  disabled={busy === task.id}
                  onClick={() => void handle(task)}
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
          </li>
        );
      })}
    </ul>
  );
}
