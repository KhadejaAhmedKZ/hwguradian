import { CategoryBar, DailyColumns, TopSites } from '../src/options/components/charts';
import { ApprovalsPanel } from '../src/options/components/ApprovalsPanel';
import { ChoresPanel } from '../src/options/components/ChoresPanel';
import { formatDuration } from '@shared/categories';
import { demoChores, me, sibling, verifiedTask } from './demoData';

const WEEK = [
  { day: '2026-09-06', label: '6/9', seconds: 7_800 },
  { day: '2026-09-07', label: '7/9', seconds: 11_400 },
  { day: '2026-09-08', label: '8/9', seconds: 5_100 },
  { day: '2026-09-09', label: '9/9', seconds: 9_600 },
  { day: '2026-09-10', label: '10/9', seconds: 13_200 },
  { day: '2026-09-11', label: '11/9', seconds: 6_300 },
  { day: '2026-09-12', label: '12/9', seconds: 8_100 },
];

const SLICES = [
  { id: 'video' as const, seconds: 3_300 },
  { id: 'social' as const, seconds: 1_500 },
  { id: 'learning' as const, seconds: 2_400 },
  { id: 'games' as const, seconds: 600 },
  { id: 'other' as const, seconds: 300 },
];

const SITES = [
  { domain: 'youtube.com', seconds: 3_000 },
  { domain: 'classroom.google.com', seconds: 1_620 },
  { domain: 'tiktok.com', seconds: 1_500 },
  { domain: 'wikipedia.org', seconds: 780 },
  { domain: 'roblox.com', seconds: 600 },
  { domain: 'bbc.co.uk', seconds: 300 },
];

const weekTotal = WEEK.reduce((sum, d) => sum + d.seconds, 0);

/** The real chart and approval components, fed mock data. */
export function DemoScreenTime() {
  return (
    <div className="stack">
      <div className="stat-tiles">
        <div className="card stat-tile">
          <div className="big">{formatDuration(WEEK[6]!.seconds)}</div>
          <div className="lbl">Today</div>
        </div>
        <div className="card stat-tile">
          <div className="big">{formatDuration(weekTotal / 7)}</div>
          <div className="lbl">Daily average</div>
        </div>
        <div className="card stat-tile">
          <div className="big">{formatDuration(weekTotal)}</div>
          <div className="lbl">Last 7 days</div>
        </div>
      </div>

      <section className="card panel">
        <h2>Yusuf's last 7 days</h2>
        <p className="muted tiny" style={{ marginTop: 0 }}>
          Total time with a tab focused, per day. Idle and locked time is not counted.
        </p>
        <DailyColumns data={WEEK} />
      </section>

      <div className="grid-two">
        <section className="card panel">
          <h2>Today by category</h2>
          <CategoryBar slices={SLICES} />
        </section>
        <section className="card panel">
          <h2>Today's sites</h2>
          <TopSites rows={SITES} />
        </section>
      </div>
    </div>
  );
}

export function DemoApprovals() {
  return (
    <div className="demo-readonly">
      <ApprovalsPanel hid="demo" childrenList={[me, sibling]} tasks={[verifiedTask]} />
    </div>
  );
}

export function DemoChores() {
  return (
    <div className="demo-readonly">
      <ChoresPanel hid="demo" childrenList={[me, sibling]} chores={demoChores} />
    </div>
  );
}
