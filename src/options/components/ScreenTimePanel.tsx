import { useEffect, useMemo, useState } from 'react';
import { getDocs, limit, orderBy, query } from 'firebase/firestore';
import { parentDb } from '../../firebase';
import { usageCol } from '../../lib/paths';
import { CATEGORIES, categoryOf, formatDuration, type CategoryId } from '@shared/categories';
import { dayKey, previousDay } from '@shared/awards';
import { setScreenTimeEnabled } from '../../lib/parentActions';
import { CategoryBar, DailyColumns, TopSites, type DayPoint } from './charts';
import type { Child, Household, UsageDay } from '@shared/types';

const DAYS = 7;

export function ScreenTimePanel({
  household,
  childrenList,
}: {
  household: Household;
  childrenList: Child[];
}) {
  const [childId, setChildId] = useState(childrenList[0]?.id ?? '');
  const [days, setDays] = useState<UsageDay[]>([]);
  const [loading, setLoading] = useState(false);

  const child = childrenList.find((c) => c.id === childId) ?? childrenList[0];
  const timezone = household.timezone || 'UTC';

  useEffect(() => {
    if (!child || !household.screenTimeEnabled) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const snap = await getDocs(
        query(usageCol(parentDb(), household.id, child.id), orderBy('day', 'desc'), limit(DAYS)),
      );
      if (cancelled) return;
      setDays(snap.docs.map((d) => ({ day: d.id, ...(d.data() as Omit<UsageDay, 'day'>) })));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [child?.id, household.id, household.screenTimeEnabled]);

  const byDay = useMemo(() => new Map(days.map((d) => [d.day, d])), [days]);

  const week = useMemo<DayPoint[]>(() => {
    const today = dayKey(new Date(), timezone);
    const keys: string[] = [today];
    for (let i = 1; i < DAYS; i++) keys.unshift(previousDay(keys[0]!));
    return keys.map((key) => {
      const [, m, d] = key.split('-').map(Number);
      return {
        day: key,
        label: `${d}/${m}`,
        seconds: byDay.get(key)?.totalSeconds ?? 0,
      };
    });
  }, [byDay, timezone]);

  const today = week[week.length - 1]?.day ?? '';
  const todayDoc = byDay.get(today);

  const topSites = useMemo(() => {
    const domains = todayDoc?.domains ?? {};
    return Object.entries(domains)
      .map(([domain, seconds]) => ({ domain, seconds }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 8);
  }, [todayDoc]);

  const slices = useMemo(() => {
    const totals = new Map<CategoryId, number>();
    for (const [domain, seconds] of Object.entries(todayDoc?.domains ?? {})) {
      const id = categoryOf(domain);
      totals.set(id, (totals.get(id) ?? 0) + seconds);
    }
    return CATEGORIES.map((c) => ({ id: c.id, seconds: totals.get(c.id) ?? 0 }));
  }, [todayDoc]);

  const weekTotal = week.reduce((sum, d) => sum + d.seconds, 0);
  const dailyAverage = weekTotal / DAYS;

  if (!household.screenTimeEnabled) {
    return (
      <section className="card panel center-text">
        <div style={{ fontSize: 30 }}>📊</div>
        <h2>Screen time is off</h2>
        <p className="muted" style={{ maxWidth: 460, margin: '8px auto 0', lineHeight: 1.6 }}>
          Turn this on and the extension will record <strong>how many seconds are spent on each
          domain, per day</strong>, on the child's browser. It does not record URLs, page titles,
          page content, or the order things were visited.
        </p>
        <p className="muted tiny" style={{ maxWidth: 460, margin: '10px auto 16px' }}>
          Tell your child it is on. A monitoring tool they know about is a house rule; one they
          discover later is something else.
        </p>
        <button onClick={() => void setScreenTimeEnabled(household.id, true)}>
          Turn on screen time
        </button>
      </section>
    );
  }

  if (!child) {
    return <div className="card panel muted">Add a child to see their screen time.</div>;
  }

  return (
    <div className="stack">
      <section className="card panel">
        <div className="spread">
          <h2>Screen time</h2>
          <div className="row">
            {childrenList.length > 1 && (
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                aria-label="Child"
                style={{ width: 'auto' }}
              >
                {childrenList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.avatarEmoji} {c.name}
                  </option>
                ))}
              </select>
            )}
            <button
              className="ghost small"
              onClick={() => void setScreenTimeEnabled(household.id, false)}
            >
              Turn off
            </button>
          </div>
        </div>

        <div className="stat-tiles" style={{ marginTop: 14 }}>
          <div className="card stat-tile">
            <div className="big">{formatDuration(todayDoc?.totalSeconds ?? 0)}</div>
            <div className="lbl">Today</div>
          </div>
          <div className="card stat-tile">
            <div className="big">{formatDuration(dailyAverage)}</div>
            <div className="lbl">Daily average</div>
          </div>
          <div className="card stat-tile">
            <div className="big">{formatDuration(weekTotal)}</div>
            <div className="lbl">Last 7 days</div>
          </div>
        </div>
      </section>

      <section className="card panel">
        <h2>{child.name}'s last 7 days</h2>
        <p className="muted tiny" style={{ marginTop: 0 }}>
          Total time with a tab focused, per day. Idle and locked time is not counted.
        </p>
        {loading ? <div className="loader" /> : <DailyColumns data={week} />}
      </section>

      <div className="grid-two">
        <section className="card panel">
          <h2>Today by category</h2>
          <CategoryBar slices={slices} />
        </section>

        <section className="card panel">
          <h2>Today's sites</h2>
          <TopSites rows={topSites} />
        </section>
      </div>

      <p className="muted tiny">
        Measured on the child's own browser, so it is only as complete as that browser — another
        device, another profile, or the extension being removed all mean time that is simply not
        recorded.
      </p>
    </div>
  );
}
