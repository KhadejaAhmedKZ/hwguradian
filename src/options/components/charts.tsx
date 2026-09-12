import { useState } from 'react';
import { CATEGORIES, formatDuration, type CategoryId } from '@shared/categories';

/* Marks follow one spec throughout: bars capped at 24px with a 4px rounded
   data-end and a square baseline, hairline solid gridlines, a 2px surface gap
   between touching segments, and labels applied selectively rather than on
   every value. Every chart here also has a table view beside it, which is what
   carries the numbers for the lower-contrast series colours. */

const W = 680;
const H = 220;
const PAD = { top: 18, right: 12, bottom: 30, left: 46 };
const MAX_BAR = 24;

/**
 * Axis ticks in minutes, snapped to durations people actually read — quarter
 * hours and hours, never "1.7h". The top tick always clears the tallest bar, so
 * nothing draws above the plot.
 */
const TICK_STEPS = [5, 10, 15, 30, 60, 120, 180, 240, 360, 480, 720];

function niceTicks(maxMinutes: number): number[] {
  if (maxMinutes <= 0) return [0];
  const step = TICK_STEPS.find((s) => maxMinutes / s <= 4) ?? TICK_STEPS[TICK_STEPS.length - 1]!;
  const top = Math.ceil(maxMinutes / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 0.001; v += step) ticks.push(v);
  return ticks;
}

/** "0m" / "45m" / "2h" / "1h 30m" — the axis never shows a decimal hour. */
function tickLabel(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export interface DayPoint {
  day: string;
  label: string;
  seconds: number;
}

/** Daily totals over a week. One series, so no legend — the title names it. */
export function DailyColumns({ data }: { data: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxMinutes = Math.max(...data.map((d) => d.seconds / 60), 1);
  const ticks = niceTicks(maxMinutes);
  const top = ticks[ticks.length - 1] || 1;
  const band = plotW / Math.max(data.length, 1);
  const barW = Math.min(MAX_BAR, band * 0.55);
  const peak = data.reduce((best, d, i) => (d.seconds > (data[best]?.seconds ?? -1) ? i : best), 0);

  const y = (minutes: number) => PAD.top + plotH - (minutes / top) * plotH;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Screen time per day">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="gridline" />
            <text x={PAD.left - 9} y={y(t) + 4} className="axis-text" textAnchor="end">
              {tickLabel(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const minutes = d.seconds / 60;
          const cx = PAD.left + band * i + band / 2;
          const barH = Math.max(minutes > 0 ? 3 : 0, (minutes / top) * plotH);
          return (
            <g key={d.day}>
              {/* A full-height hit target, so the hover isn't limited to the mark. */}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              />
              {barH > 0 && (
                <path
                  d={roundedTopBar(cx - barW / 2, PAD.top + plotH - barH, barW, barH, 4)}
                  className={`col${hover === i ? ' hot' : ''}`}
                />
              )}
              <text x={cx} y={H - 9} className="axis-text" textAnchor="middle">
                {d.label}
              </text>
              {i === peak && d.seconds > 0 && (
                <text x={cx} y={PAD.top + plotH - barH - 7} className="value-label" textAnchor="middle">
                  {formatDuration(d.seconds)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hover !== null && data[hover] && (
        <div className="chart-tip" style={{ left: `${((PAD.left + band * hover + band / 2) / W) * 100}%` }}>
          <strong>{data[hover]!.label}</strong>
          <span>{formatDuration(data[hover]!.seconds)}</span>
        </div>
      )}
    </div>
  );
}

/** Bar path with a rounded data-end and a square foot on the baseline. */
function roundedTopBar(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h);
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `L ${x + w - radius} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + radius}`,
    `L ${x + w} ${y + h}`,
    'Z',
  ].join(' ');
}

export interface CategorySlice {
  id: CategoryId;
  seconds: number;
}

/**
 * One stacked bar for today's split. Three of the series colours sit under 3:1
 * on a light surface, so the legend below carries the label and value for every
 * segment — identity is never left to colour alone.
 */
export function CategoryBar({ slices }: { slices: CategorySlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.seconds, 0);
  if (total <= 0) {
    return <p className="muted tiny">Nothing recorded yet today.</p>;
  }
  const ordered = CATEGORIES.map((c) => ({
    def: c,
    seconds: slices.find((s) => s.id === c.id)?.seconds ?? 0,
  })).filter((s) => s.seconds > 0);

  return (
    <div>
      <div className="cat-bar" role="img" aria-label="Time split by category">
        {ordered.map(({ def, seconds }) => (
          <div
            key={def.id}
            className="cat-seg"
            style={{ flexGrow: seconds, background: def.color }}
            title={`${def.label} · ${formatDuration(seconds)}`}
          />
        ))}
      </div>
      <ul className="cat-legend">
        {ordered.map(({ def, seconds }) => (
          <li key={def.id}>
            <span className="swatch" style={{ background: def.color }} aria-hidden="true" />
            <span className="grow">{def.label}</span>
            <span className="cat-value">{formatDuration(seconds)}</span>
            <span className="cat-pct muted">{Math.round((seconds / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Top domains — horizontal bars that double as the table view. */
export function TopSites({ rows }: { rows: { domain: string; seconds: number }[] }) {
  if (rows.length === 0) return <p className="muted tiny">Nothing recorded yet.</p>;
  const max = Math.max(...rows.map((r) => r.seconds), 1);
  return (
    <ul className="site-list">
      {rows.map((row) => (
        <li key={row.domain}>
          <span className="site-name">{row.domain}</span>
          <span className="site-track">
            <span className="site-fill" style={{ width: `${(row.seconds / max) * 100}%` }} />
          </span>
          <span className="site-value">{formatDuration(row.seconds)}</span>
        </li>
      ))}
    </ul>
  );
}
