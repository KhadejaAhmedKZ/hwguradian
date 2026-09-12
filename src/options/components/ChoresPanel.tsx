import { useState } from 'react';
import type { Child, Chore, ChoreRecurrence } from '@shared/types';
import { DAY_LABELS, RECURRENCE_LABEL } from '@shared/chores';
import {
  createChore,
  deleteChore,
  syncChoresNow,
  updateChore,
  type ChoreDraft,
} from '../../lib/parentActions';
import { runTextAgent } from '../../lib/agents';
import { parentFunctions } from '../../firebase';
import { DEFAULT_TASK_POINTS } from '../../config';

const EMPTY: ChoreDraft = {
  title: '',
  description: '',
  childId: '',
  pointsValue: DEFAULT_TASK_POINTS,
  recurrence: 'daily',
  daysOfWeek: [1, 3, 5],
  requiresEvidence: true,
  active: true,
};

export function ChoresPanel({
  hid,
  childrenList,
  chores,
}: {
  hid: string;
  childrenList: Child[];
  chores: Chore[];
}) {
  const [draft, setDraft] = useState<ChoreDraft>({ ...EMPTY, childId: childrenList[0]?.id ?? '' });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<string[]>([]);

  const set = <K extends keyof ChoreDraft>(key: K, value: ChoreDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const nameOf = (id: string) =>
    id === 'rotate' ? 'Rotating' : (childrenList.find((c) => c.id === id)?.name ?? 'Unassigned');

  const add = async () => {
    if (!draft.title.trim() || !draft.childId) {
      setError('A chore needs a title and someone to do it.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createChore(hid, { ...draft, title: draft.title.trim(), description: draft.description.trim() });
      setDraft({ ...EMPTY, childId: childrenList[0]?.id ?? '' });
      setNote('Chore saved. It becomes a task on the days it is due.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await syncChoresNow(hid);
      setNote(created > 0 ? `Created ${created} task${created === 1 ? '' : 's'} for today.` : 'Everything due today is already there.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const suggest = async () => {
    setBusy(true);
    try {
      const lines = await runTextAgent(parentFunctions(), 'chore_planner', {
        householdId: hid,
        prompt: `Children: ${childrenList.map((c) => c.name).join(', ') || 'one child'}. Suggest household chores.`,
      });
      setIdeas(lines);
    } catch {
      setError('The planner agent is unavailable right now.');
    } finally {
      setBusy(false);
    }
  };

  if (childrenList.length === 0) {
    return <div className="card panel muted">Add a child first, then you can set up chores.</div>;
  }

  return (
    <div className="stack">
      <section className="card panel">
        <div className="spread">
          <div>
            <h2>Repeating chores</h2>
            <p className="muted tiny" style={{ margin: 0 }}>
              A chore is a template. On each day it is due it becomes a real task in the child's
              list — the same task that holds the gate closed.
            </p>
          </div>
          <button className="ghost" disabled={busy} onClick={() => void sync()}>
            Create today's tasks
          </button>
        </div>

        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="grow">
            <label htmlFor="chore-title">Chore</label>
            <input
              id="chore-title"
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Tidy your bedroom"
            />
          </div>
          <div>
            <label htmlFor="chore-child">Who</label>
            <select
              id="chore-child"
              value={draft.childId}
              onChange={(e) => set('childId', e.target.value)}
            >
              {childrenList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.avatarEmoji} {c.name}
                </option>
              ))}
              {childrenList.length > 1 && <option value="rotate">🔁 Rotate between them</option>}
            </select>
          </div>
          <div style={{ width: 90 }}>
            <label htmlFor="chore-points">Points</label>
            <input
              id="chore-points"
              type="number"
              min={1}
              value={draft.pointsValue}
              onChange={(e) => set('pointsValue', Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div>
            <label htmlFor="chore-rec">Repeats</label>
            <select
              id="chore-rec"
              value={draft.recurrence}
              onChange={(e) => set('recurrence', e.target.value as ChoreRecurrence)}
            >
              {(Object.keys(RECURRENCE_LABEL) as ChoreRecurrence[]).map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {draft.recurrence === 'weekly' && (
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            {DAY_LABELS.map((label, index) => (
              <button
                key={label}
                className={`small ${draft.daysOfWeek.includes(index) ? '' : 'ghost'}`}
                onClick={() =>
                  set(
                    'daysOfWeek',
                    draft.daysOfWeek.includes(index)
                      ? draft.daysOfWeek.filter((d) => d !== index)
                      : [...draft.daysOfWeek, index].sort(),
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label htmlFor="chore-desc">What counts as done</label>
          <textarea
            id="chore-desc"
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Clothes in the basket, bed made, floor clear enough to walk across."
          />
          <p className="muted tiny" style={{ margin: '6px 0 0' }}>
            This is what the verifier agent checks the child's description against. The more
            concrete it is, the more useful the check.
          </p>
        </div>

        <label className="check-line" style={{ marginTop: 12 }}>
          <input
            type="checkbox"
            checked={draft.requiresEvidence}
            onChange={(e) => set('requiresEvidence', e.target.checked)}
          />
          <span>Ask the child to describe what they did before submitting</span>
        </label>

        <div className="row" style={{ marginTop: 14, flexWrap: 'wrap' }}>
          <button disabled={busy} onClick={() => void add()}>
            Add chore
          </button>
          <button className="ghost small" disabled={busy} onClick={() => void suggest()}>
            ✨ Ask the planner agent
          </button>
          {ideas.map((idea) => (
            <button key={idea} className="ghost small" onClick={() => set('title', idea)}>
              {idea}
            </button>
          ))}
        </div>
        {note && <div className="notice tiny" style={{ marginTop: 10 }}>{note}</div>}
        {error && <div className="notice warm tiny" style={{ marginTop: 10 }}>{error}</div>}
      </section>

      <section className="card panel">
        <h2>Your chores</h2>
        {chores.length === 0 && <p className="muted tiny">Nothing set up yet.</p>}
        <ul className="plain-list stack">
          {chores.map((chore) => (
            <li key={chore.id} className="list-row chore-row">
              <span className={`status-dot ${chore.active ? 'approved' : 'pending'}`} aria-hidden="true" />
              <span className="grow">
                <strong>{chore.title}</strong>
                <span className="tiny muted chore-meta">
                  {nameOf(chore.childId)} · {RECURRENCE_LABEL[chore.recurrence]}
                  {chore.recurrence === 'weekly' &&
                    ` (${chore.daysOfWeek.map((d) => DAY_LABELS[d]).join(', ')})`}
                  {chore.requiresEvidence ? ' · needs a note' : ''}
                </span>
              </span>
              <span className="pill brand">{chore.pointsValue} pts</span>
              <button
                className="ghost small"
                onClick={() => void updateChore(hid, chore.id, { active: !chore.active })}
              >
                {chore.active ? 'Pause' : 'Resume'}
              </button>
              <button className="ghost small" onClick={() => void deleteChore(hid, chore.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
