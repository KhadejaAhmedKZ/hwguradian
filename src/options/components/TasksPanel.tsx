import { useState } from 'react';
import type { Child, Task } from '@shared/types';
import { createTask, deleteTask } from '../../lib/parentActions';
import { runTextAgent } from '../../lib/agents';
import { FALLBACK_TASK_SUGGESTIONS } from '../../lib/gemini';
import { parentFunctions } from '../../firebase';
import { DEFAULT_TASK_POINTS } from '../../config';

export function TasksPanel({
  hid,
  childrenList,
  tasks,
}: {
  hid: string;
  childrenList: Child[];
  tasks: Task[];
}) {
  const [childId, setChildId] = useState(childrenList[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState(String(DEFAULT_TASK_POINTS));
  const [needsNote, setNeedsNote] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = childrenList.find((c) => c.id === childId) ?? childrenList[0];

  const add = async () => {
    if (!title.trim() || !selected) return;
    const value = Math.max(1, Math.round(Number(points) || DEFAULT_TASK_POINTS));
    await createTask(hid, selected.id, title.trim(), value, needsNote);
    setTitle('');
  };

  const suggest = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const lines = await runTextAgent(parentFunctions(), 'chore_planner', {
        householdId: hid,
        prompt: `Child name: ${selected?.name ?? 'the child'}. Suggest homework and chore tasks.`,
      });
      setSuggestions(lines.length ? lines : FALLBACK_TASK_SUGGESTIONS);
    } catch {
      setSuggestions(FALLBACK_TASK_SUGGESTIONS);
      setError('The planner agent is unavailable — showing a few standbys instead.');
    } finally {
      setSuggesting(false);
    }
  };

  if (childrenList.length === 0) {
    return <div className="card panel muted">Add a child first, then you can assign tasks.</div>;
  }

  const byChild = tasks.filter((t) => t.childId === (selected?.id ?? ''));

  return (
    <div className="stack">
      <section className="card panel">
        <h2>New task</h2>
        <div className="form-row">
          <div>
            <label htmlFor="task-child">For</label>
            <select id="task-child" value={childId} onChange={(e) => setChildId(e.target.value)}>
              {childrenList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.avatarEmoji} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grow">
            <label htmlFor="task-title">Task</label>
            <input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void add()}
              placeholder="Finish maths worksheet"
            />
          </div>
          <div style={{ width: 90 }}>
            <label htmlFor="task-points">Points</label>
            <input
              id="task-points"
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>
          <button onClick={() => void add()}>Add task</button>
        </div>

        <label className="check-line" style={{ marginTop: 12 }}>
          <input
            type="checkbox"
            checked={needsNote}
            onChange={(e) => setNeedsNote(e.target.checked)}
          />
          <span>Ask for a written note, and have the verifier agent read it</span>
        </label>

        <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <button className="ghost small" disabled={suggesting} onClick={() => void suggest()}>
            {suggesting ? 'Thinking…' : '✨ Suggest tasks'}
          </button>
          {suggestions.map((s) => (
            <button key={s} className="ghost small" onClick={() => setTitle(s)}>
              {s}
            </button>
          ))}
        </div>
        {error && <div className="notice warm tiny" style={{ marginTop: 8 }}>{error}</div>}
      </section>

      <section className="card panel">
        <h2>{selected?.name}'s tasks</h2>
        {byChild.length === 0 && <p className="muted tiny">Nothing assigned yet.</p>}
        <ul className="plain-list stack">
          {byChild.map((task) => (
            <li key={task.id} className="list-row">
              <span className={`status-dot ${task.status}`} aria-hidden="true" />
              <span className="grow">{task.title}</span>
              <span className="pill brand">{task.pointsValue} pts</span>
              <span className="pill">{label(task.status)}</span>
              <button className="ghost small" onClick={() => void deleteTask(hid, task.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function label(status: Task['status']): string {
  if (status === 'pending') return 'To do';
  if (status === 'pending_approval') return 'Needs approval';
  return 'Approved';
}
