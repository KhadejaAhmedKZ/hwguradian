import { useMemo, type CSSProperties } from 'react';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#38bdf8', '#f97316'];

/** Pure-CSS burst. Mounted for ~900ms after a task is marked done. */
export function Confetti({ pieces = 18 }: { pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const angle = (Math.PI * 2 * i) / pieces + Math.random() * 0.4;
        const distance = 42 + Math.random() * 46;
        return {
          key: i,
          dx: `${Math.cos(angle) * distance}px`,
          dy: `${Math.sin(angle) * distance - 12}px`,
          rot: `${Math.round((Math.random() - 0.5) * 540)}deg`,
          color: COLORS[i % COLORS.length],
          delay: `${Math.random() * 60}ms`,
          size: 5 + Math.round(Math.random() * 4),
        };
      }),
    [pieces],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b) => (
        <span
          key={b.key}
          style={
            {
              '--dx': b.dx,
              '--dy': b.dy,
              '--rot': b.rot,
              background: b.color,
              animationDelay: b.delay,
              width: b.size,
              height: b.size,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
