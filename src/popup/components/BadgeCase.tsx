import { BADGES } from '@shared/badges';
import type { EarnedBadge } from '@shared/types';

export function BadgeCase({ earned }: { earned: EarnedBadge[] }) {
  const byKey = new Map(earned.map((b) => [b.key, b]));
  const count = BADGES.filter((b) => byKey.has(b.key)).length;

  return (
    <div className="stack">
      <div className="spread">
        <h2 className="section-title">Badge case</h2>
        <span className="pill brand">
          {count}/{BADGES.length}
        </span>
      </div>
      <div className="badge-grid">
        {BADGES.map((badge) => {
          const got = byKey.get(badge.key);
          return (
            <div key={badge.key} className={`badge card${got ? ' earned' : ''}`}>
              <div className="badge-icon">{badge.icon}</div>
              <div className="badge-name">{badge.name}</div>
              <div className="tiny muted badge-sub">
                {got
                  ? new Date(got.earnedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })
                  : badge.criteria}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
