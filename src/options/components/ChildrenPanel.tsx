import { useState } from 'react';
import type { Child } from '@shared/types';
import { addChild, awardBonusPoints, createPairingCode, removeChild } from '../../lib/parentActions';

const EMOJI = ['🦊', '🐼', '🐙', '🦄', '🐝', '🦕', '🐳', '🌟', '🚀', '🎈'];

export function ChildrenPanel({ hid, children }: { hid: string; children: Child[] }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI[0]!);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [bonus, setBonus] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!name.trim()) return;
    try {
      await addChild(hid, name.trim(), emoji);
      setName('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const pair = async (cid: string) => {
    const code = await createPairingCode(hid, cid);
    setCodes((c) => ({ ...c, [cid]: code }));
  };

  const giveBonus = async (cid: string) => {
    const value = Number(bonus[cid]);
    if (!Number.isFinite(value) || value === 0) return;
    await awardBonusPoints(hid, cid, Math.round(value));
    setBonus((b) => ({ ...b, [cid]: '' }));
  };

  return (
    <div className="stack">
      <section className="card panel">
        <h2>Add a child</h2>
        <div className="form-row">
          <div className="grow">
            <label htmlFor="child-name">Name</label>
            <input id="child-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="child-emoji">Avatar</label>
            <select id="child-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)}>
              {EMOJI.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => void add()}>Add</button>
        </div>
        {error && <div className="notice warm tiny">{error}</div>}
      </section>

      {children.map((child) => (
        <section key={child.id} className="card panel">
          <div className="spread">
            <div className="row">
              <span style={{ fontSize: 28 }}>{child.avatarEmoji}</span>
              <div>
                <h2 style={{ fontSize: 16 }}>{child.name}</h2>
                <div className="tiny muted">
                  {child.totalPoints} pts · 🔥 {child.currentStreak} day streak · best{' '}
                  {child.longestStreak} · {child.tasksApproved} approved
                </div>
              </div>
            </div>
            <div className="row">
              <button className="ghost small" onClick={() => void pair(child.id)}>
                Pairing code
              </button>
              <button
                className="danger small"
                onClick={() => {
                  if (confirm(`Remove ${child.name}? Their tasks stay but the profile is deleted.`))
                    void removeChild(hid, child.id);
                }}
              >
                Remove
              </button>
            </div>
          </div>

          {codes[child.id] && (
            <div className="notice code-notice">
              <div>
                Type this into the popup on <strong>{child.name}'s</strong> browser. Valid 24 hours,
                one use.
              </div>
              <div className="pair-code">{codes[child.id]}</div>
            </div>
          )}

          <div className="form-row" style={{ marginTop: 12 }}>
            <div>
              <label htmlFor={`bonus-${child.id}`}>Bonus points</label>
              <input
                id={`bonus-${child.id}`}
                type="number"
                value={bonus[child.id] ?? ''}
                onChange={(e) => setBonus((b) => ({ ...b, [child.id]: e.target.value }))}
                placeholder="e.g. 5"
              />
            </div>
            <button className="ghost" onClick={() => void giveBonus(child.id)}>
              Award
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
