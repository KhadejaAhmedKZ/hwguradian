import { useEffect, useState } from 'react';
import type { Child, LeaderboardMetric } from '@shared/types';
import { getPreviousRanks, setPreviousRanks } from '../../lib/storage';

interface Props {
  children: Child[];
  meId: string;
  defaultMetric: LeaderboardMetric;
}

/** Household only. Nothing here ever leaves the household's own documents. */
export function Leaderboard({ children, meId, defaultMetric }: Props) {
  const [metric, setMetric] = useState<LeaderboardMetric>(defaultMetric);
  const [previous, setPrevious] = useState<Record<string, number>>({});

  const ranked = [...children].sort((a, b) =>
    metric === 'points' ? b.totalPoints - a.totalPoints : b.currentStreak - a.currentStreak,
  );

  useEffect(() => {
    let cancelled = false;
    void getPreviousRanks().then((ranks) => {
      if (cancelled) return;
      setPrevious(ranks);
      const next: Record<string, number> = {};
      ranked.forEach((c, i) => (next[c.id] = i + 1));
      void setPreviousRanks(next);
    });
    return () => {
      cancelled = true;
    };
    // Snapshot once per popup open, on purpose: the arrows mean "since you last looked".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, children.length]);

  if (children.length < 2) {
    return (
      <div className="empty card">
        <div className="empty-emoji">🏅</div>
        <strong>Just you for now</strong>
        <p className="muted tiny">The scoreboard shows up when a sibling joins.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="spread">
        <h2 className="section-title">Household scoreboard</h2>
        <div className="toggle">
          <button
            className={`small ${metric === 'points' ? '' : 'ghost'}`}
            onClick={() => setMetric('points')}
          >
            Points
          </button>
          <button
            className={`small ${metric === 'streak' ? '' : 'ghost'}`}
            onClick={() => setMetric('streak')}
          >
            Streak
          </button>
        </div>
      </div>

      <ul className="plain-list stack">
        {ranked.map((c, index) => {
          const rank = index + 1;
          const was = previous[c.id];
          const delta = was ? was - rank : 0;
          return (
            <li key={c.id} className={`board-row card${c.id === meId ? ' me' : ''}`}>
              <span className="board-rank">{rank}</span>
              <span className="board-avatar" aria-hidden="true">{c.avatarEmoji || '🙂'}</span>
              <span className="grow board-name">
                {c.name}
                {c.id === meId && <span className="pill brand" style={{ marginLeft: 6 }}>you</span>}
              </span>
              {delta !== 0 && (
                <span className={`board-delta ${delta > 0 ? 'up' : 'down'}`}>
                  {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
                </span>
              )}
              <span className="board-score">
                {metric === 'points' ? `${c.totalPoints} pts` : `🔥 ${c.currentStreak}`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="tiny muted" style={{ textAlign: 'center' }}>
        Everyone is on their own pace — this is just a scoreboard. 💛
      </p>
    </div>
  );
}
