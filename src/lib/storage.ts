// Everything this extension keeps on the device. Deliberately short.

import type { GatePolicy, Task } from '@shared/types';

export interface CachedState {
  householdId: string | null;
  childId: string | null;
  childName: string | null;
  blockedDomains: string[];
  openTasks: Pick<Task, 'id' | 'title' | 'pointsValue' | 'status'>[];
  /** True when the gate should be closed, per the household's gate policy. */
  anyPending: boolean;
  gatePolicy: GatePolicy;
  screenTimeEnabled: boolean;
  timezone: string;
  updatedAt: number;
}

export interface PinRecord {
  saltHex: string;
  hashHex: string;
  iterations: number;
}

const DEFAULT_STATE: CachedState = {
  householdId: null,
  childId: null,
  childName: null,
  blockedDomains: [],
  openTasks: [],
  anyPending: false,
  gatePolicy: 'parent_only',
  screenTimeEnabled: false,
  timezone: 'UTC',
  updatedAt: 0,
};

export async function getCachedState(): Promise<CachedState> {
  const { cachedState } = await chrome.storage.local.get('cachedState');
  return { ...DEFAULT_STATE, ...(cachedState ?? {}) };
}

export async function setCachedState(patch: Partial<CachedState>): Promise<CachedState> {
  const next = { ...(await getCachedState()), ...patch, updatedAt: Date.now() };
  await chrome.storage.local.set({ cachedState: next });
  return next;
}

export async function clearCachedState(): Promise<void> {
  await chrome.storage.local.remove('cachedState');
}

export async function getPin(): Promise<PinRecord | null> {
  const { parentPin } = await chrome.storage.local.get('parentPin');
  return parentPin ?? null;
}

export async function setPin(record: PinRecord): Promise<void> {
  await chrome.storage.local.set({ parentPin: record });
}

/** Leaderboard rank from the child's previous visit, for the change arrows. */
export async function getPreviousRanks(): Promise<Record<string, number>> {
  const { previousRanks } = await chrome.storage.local.get('previousRanks');
  return previousRanks ?? {};
}

export async function setPreviousRanks(ranks: Record<string, number>): Promise<void> {
  await chrome.storage.local.set({ previousRanks: ranks });
}
