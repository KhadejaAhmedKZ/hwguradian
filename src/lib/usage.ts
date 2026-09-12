/**
 * Screen time accounting, on-device.
 *
 * What this records: seconds per domain, per day. That is all. No URLs, no page
 * titles, no page content, no per-visit timestamps — the stored shape is a flat
 * `{ "youtube.com": 1260 }` map that cannot be reconstructed into a history.
 *
 * It only runs when the household has turned it on.
 */

import { hostnameOf } from '@shared/domains';

const ACTIVE_KEY = 'usageActive';
const LOCAL_KEY = 'usageLocal';

/** A single focus segment longer than this is treated as the machine sleeping. */
const MAX_SEGMENT_SECONDS = 30 * 60;

interface ActiveSegment {
  domain: string;
  since: number;
}

export interface LocalUsage {
  day: string;
  domains: Record<string, number>;
  /** True when there are unflushed seconds. */
  dirty: boolean;
}

async function readActive(): Promise<ActiveSegment | null> {
  const data = await chrome.storage.session.get(ACTIVE_KEY);
  return (data[ACTIVE_KEY] as ActiveSegment | undefined) ?? null;
}

async function writeActive(segment: ActiveSegment | null): Promise<void> {
  if (segment) await chrome.storage.session.set({ [ACTIVE_KEY]: segment });
  else await chrome.storage.session.remove(ACTIVE_KEY);
}

export async function readLocalUsage(): Promise<LocalUsage | null> {
  const data = await chrome.storage.local.get(LOCAL_KEY);
  return (data[LOCAL_KEY] as LocalUsage | undefined) ?? null;
}

async function writeLocalUsage(usage: LocalUsage): Promise<void> {
  await chrome.storage.local.set({ [LOCAL_KEY]: usage });
}

/** Bank whatever time the currently-focused domain has accrued. */
export async function commitActiveSegment(today: string): Promise<void> {
  const active = await readActive();
  await writeActive(null);
  if (!active) return;

  const seconds = Math.min(
    MAX_SEGMENT_SECONDS,
    Math.max(0, Math.round((Date.now() - active.since) / 1000)),
  );
  if (seconds < 1) return;

  const current = await readLocalUsage();
  const usage: LocalUsage =
    current && current.day === today ? current : { day: today, domains: {}, dirty: false };

  usage.domains[active.domain] = (usage.domains[active.domain] ?? 0) + seconds;
  usage.dirty = true;
  await writeLocalUsage(usage);
}

/**
 * Point the clock at a URL's domain. Commits whatever was running first, so
 * switching tabs banks the old tab's time before starting the new one.
 */
export async function startSegment(url: string | undefined, today: string): Promise<void> {
  await commitActiveSegment(today);
  const domain = hostnameOf(url);
  if (!domain) return; // chrome://, about:, file:// — not counted, not recorded
  await writeActive({ domain, since: Date.now() });
}

/** Stop the clock entirely — window blurred, machine idle or locked. */
export async function pauseTracking(today: string): Promise<void> {
  await commitActiveSegment(today);
}

export async function markFlushed(): Promise<void> {
  const current = await readLocalUsage();
  if (!current) return;
  await writeLocalUsage({ ...current, dirty: false });
}

/** Forget everything held locally — used when tracking is switched off. */
export async function clearLocalUsage(): Promise<void> {
  await chrome.storage.local.remove(LOCAL_KEY);
  await chrome.storage.session.remove(ACTIVE_KEY);
}

export function totalSecondsOf(usage: Pick<LocalUsage, 'domains'>): number {
  return Object.values(usage.domains).reduce((sum, n) => sum + n, 0);
}
