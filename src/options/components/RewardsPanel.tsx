import { useState } from 'react';
import type { Child, Redemption, Reward } from '@shared/types';
import {
  createReward,
  declineRedemption,
  deleteReward,
  grantRedemption,
  setRewardActive,
} from '../../lib/parentActions';

export function RewardsPanel({
  hid,
  childrenList,
  rewards,
  redemptions,
}: {
  hid: string;
  childrenList: Child[];
  rewards: Reward[];
  redemptions: Redemption[];
}) {
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('50');

  const add = async () => {
    if (!title.trim()) return;
    await createReward(hid, title.trim(), Math.max(1, Math.round(Number(cost) || 50)));
    setTitle('');
  };

  const requested = redemptions
    .filter((r) => r.status === 'requested')
    .sort((a, b) => b.requestedAt - a.requestedAt);
  const history = redemptions
    .filter((r) => r.status !== 'requested')
    .sort((a, b) => (b.grantedAt ?? b.requestedAt) - (a.grantedAt ?? a.requestedAt))
    .slice(0, 10);
  const nameOf = (id: string) => childrenList.find((c) => c.id === id)?.name ?? 'Child';

  return (
    <div className="stack">
      <section className="card panel">
        <h2>Waiting to be granted</h2>
        {requested.length === 0 && <p className="muted tiny">No requests right now.</p>}
        <ul className="plain-list stack">
          {requested.map((r) => (
            <li key={r.id} className="list-row">
              <span className="grow">
                <strong>{nameOf(r.childId)}</strong> wants <strong>{r.rewardTitle}</strong>
                <span className="tiny muted"> · {r.pointCost} pts already deducted</span>
              </span>
              <button className="ghost small" onClick={() => void declineRedemption(hid, r.id)}>
                Decline &amp; refund
              </button>
              <button className="small" onClick={() => void grantRedemption(hid, r.id)}>
                Granted
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card panel">
        <h2>Reward shop</h2>
        <div className="form-row">
          <div className="grow">
            <label htmlFor="reward-title">Reward</label>
            <input
              id="reward-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void add()}
              placeholder="30 minutes of game time"
            />
          </div>
          <div style={{ width: 110 }}>
            <label htmlFor="reward-cost">Point cost</label>
            <input
              id="reward-cost"
              type="number"
              min={1}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <button onClick={() => void add()}>Add reward</button>
        </div>

        <ul className="plain-list stack" style={{ marginTop: 12 }}>
          {rewards.map((reward) => (
            <li key={reward.id} className="list-row">
              <span className="grow">{reward.title}</span>
              <span className="pill brand">{reward.pointCost} pts</span>
              <button
                className="ghost small"
                onClick={() => void setRewardActive(hid, reward.id, !reward.active)}
              >
                {reward.active ? 'Hide' : 'Show'}
              </button>
              <button className="ghost small" onClick={() => void deleteReward(hid, reward.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      {history.length > 0 && (
        <section className="card panel">
          <h2>Recent</h2>
          <ul className="plain-list stack tiny muted">
            {history.map((r) => (
              <li key={r.id}>
                {r.status === 'granted' ? '✅' : r.status === 'declined' ? '↩️' : '⚠️'}{' '}
                {nameOf(r.childId)} · {r.rewardTitle} · {r.status.replace('_', ' ')}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
