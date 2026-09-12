import { useState } from 'react';
import type { Child, Redemption, Reward } from '@shared/types';

interface Props {
  child: Child;
  rewards: Reward[];
  redemptions: Redemption[];
  onRedeem: (reward: Reward) => Promise<void>;
}

export function Shop({ child, rewards, redemptions, onRedeem }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = rewards.filter((r) => r.active);
  const pending = new Map(
    redemptions.filter((r) => r.status === 'requested').map((r) => [r.rewardId, r]),
  );

  const redeem = async (reward: Reward) => {
    setBusy(reward.id);
    setError(null);
    try {
      await onRedeem(reward);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack">
      <div className="spread">
        <h2 className="section-title">Reward shop</h2>
        <span className="pill brand">{child.totalPoints} pts</span>
      </div>

      {error && <div className="notice warm tiny">{error}</div>}

      {active.length === 0 && (
        <div className="empty card">
          <div className="empty-emoji">🎁</div>
          <strong>Nothing in the shop yet</strong>
          <p className="muted tiny">Your parent can add rewards any time.</p>
        </div>
      )}

      <div className="reward-grid">
        {active.map((reward) => {
          const requested = pending.get(reward.id);
          const affordable = child.totalPoints >= reward.pointCost;
          return (
            <div key={reward.id} className="reward card animate-in">
              <div className="reward-title">{reward.title}</div>
              <div className="pill brand">{reward.pointCost} pts</div>
              {requested ? (
                <div className="pill warm reward-state">⏳ Requested — waiting for approval</div>
              ) : (
                <button
                  className="small"
                  disabled={!affordable || busy === reward.id}
                  onClick={() => void redeem(reward)}
                >
                  {affordable
                    ? busy === reward.id
                      ? 'Sending…'
                      : 'Redeem'
                    : `${reward.pointCost - child.totalPoints} pts to go`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {redemptions.some((r) => r.status === 'granted') && (
        <>
          <h3 className="section-title tiny">Granted</h3>
          <ul className="plain-list tiny muted">
            {redemptions
              .filter((r) => r.status === 'granted')
              .slice(0, 5)
              .map((r) => (
                <li key={r.id}>✅ {r.rewardTitle}</li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}
