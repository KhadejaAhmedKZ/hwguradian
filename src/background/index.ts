// MV3 service worker.
//
// Responsibilities:
//   1. Keep a local mirror of this child's household, tasks and blocked domains.
//   2. Compute any_pending and push declarativeNetRequest dynamic rules.
//   3. Answer the one activity question the popup asks at "mark done" time.
//
// The worker is assumed to die at any moment: every path re-reads state from
// chrome.storage / Firestore rather than trusting anything held in memory.

import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { childAuth, childDb } from '../firebase';
import { childLinkDoc, householdDoc, tasksCol } from '../lib/paths';
import { getCachedState, setCachedState, type CachedState } from '../lib/storage';
import { applyBlockingRules } from '../lib/blocking';
import { hostnameOf, matchesBlockedDomain } from '@shared/domains';
import { isFirebaseConfigured, RECENT_ACTIVITY_WINDOW_MS, SYNC_ALARM_MINUTES } from '../config';
import type { ExtMessage, ExtResponse } from '../lib/messages';
import type { Household, Task } from '@shared/types';

const SYNC_ALARM = 'hwg-sync';
const FOCUS_KEY = 'lastBlockedFocusAt';

let unsubscribers: Array<() => void> = [];

// ---------------------------------------------------------------------------
// Rule application
// ---------------------------------------------------------------------------

async function applyFromCache(): Promise<void> {
  const state = await getCachedState();
  await applyBlockingRules(state.anyPending, state.blockedDomains);
}

function openTasksOf(tasks: Task[]) {
  return tasks
    .filter((t) => t.status === 'pending' || t.status === 'pending_approval')
    .map((t) => ({ id: t.id, title: t.title, pointsValue: t.pointsValue, status: t.status }));
}

async function storeAndApply(
  household: Pick<Household, 'blockedDomains'>,
  tasks: Task[],
  link: { householdId: string; childId: string },
  childName: string | null,
): Promise<void> {
  const open = openTasksOf(tasks);
  const next: Partial<CachedState> = {
    householdId: link.householdId,
    childId: link.childId,
    childName,
    blockedDomains: household.blockedDomains ?? [],
    openTasks: open,
    anyPending: open.length > 0,
  };
  await setCachedState(next);
  await applyBlockingRules(open.length > 0, household.blockedDomains ?? []);
  await updateBadgeText(open.length);
}

async function updateBadgeText(openCount: number): Promise<void> {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: openCount > 0 ? '#6366f1' : '#10b981' });
    await chrome.action.setBadgeText({ text: openCount > 0 ? String(openCount) : '' });
  } catch {
    /* action API can be unavailable very early in startup */
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

async function resolveLink(user: User) {
  const snap = await getDoc(childLinkDoc(childDb(), user.uid));
  if (!snap.exists()) return null;
  const data = snap.data() as { householdId: string; childId: string };
  if (!data?.householdId || !data?.childId) return null;
  return data;
}

/** One-shot pull. This is the 60s polling fallback and the cold-start path. */
async function syncOnce(): Promise<void> {
  if (!isFirebaseConfigured) return;
  const user = childAuth().currentUser;
  if (!user) return;

  const link = await resolveLink(user);
  if (!link) return;

  const db = childDb();
  const [householdSnap, taskSnap, childSnap] = await Promise.all([
    getDoc(householdDoc(db, link.householdId)),
    getDocs(query(tasksCol(db, link.householdId), where('childId', '==', link.childId))),
    getDoc(doc(db, 'households', link.householdId, 'children', link.childId)),
  ]);
  if (!householdSnap.exists()) return;

  const household = householdSnap.data() as Household;
  const tasks = taskSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
  const childName = childSnap.exists() ? ((childSnap.data() as { name: string }).name ?? null) : null;
  await storeAndApply(household, tasks, link, childName);
}

/** Live listeners. They only live as long as the worker does — that's fine. */
async function attachListeners(user: User): Promise<void> {
  detachListeners();
  const link = await resolveLink(user);
  if (!link) return;

  const db = childDb();
  let household: Household | null = null;
  let tasks: Task[] = [];
  let childName: string | null = null;

  const push = () => {
    if (!household) return;
    void storeAndApply(household, tasks, link, childName);
  };

  unsubscribers.push(
    onSnapshot(householdDoc(db, link.householdId), (snap) => {
      if (!snap.exists()) return;
      household = { id: snap.id, ...(snap.data() as Omit<Household, 'id'>) };
      push();
    }),
    onSnapshot(
      query(tasksCol(db, link.householdId), where('childId', '==', link.childId)),
      (snap) => {
        tasks = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
        push();
      },
    ),
    onSnapshot(doc(db, 'households', link.householdId, 'children', link.childId), (snap) => {
      childName = snap.exists() ? ((snap.data() as { name: string }).name ?? null) : null;
    }),
  );
}

function detachListeners(): void {
  unsubscribers.forEach((fn) => {
    try {
      fn();
    } catch {
      /* already torn down */
    }
  });
  unsubscribers = [];
}

// ---------------------------------------------------------------------------
// Activity signal — the entire extent of it
// ---------------------------------------------------------------------------
//
// We record ONE thing: a timestamp, set when a tab on a blocked domain is
// focused. Not which domain. Not the URL. Not how long. It lives in
// chrome.storage.session, so it is gone when the browser closes, and it is read
// exactly once — when the child taps "mark done".

async function noteFocusedTab(url: string | undefined): Promise<void> {
  const { blockedDomains } = await getCachedState();
  if (blockedDomains.length === 0) return;
  if (matchesBlockedDomain(hostnameOf(url), blockedDomains)) {
    await chrome.storage.session.set({ [FOCUS_KEY]: Date.now() });
  }
}

async function wasRecentlyOnBlockedSite(): Promise<boolean> {
  const { blockedDomains } = await getCachedState();
  if (blockedDomains.length === 0) return false;

  // 1. The tab that is active right now.
  try {
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (matchesBlockedDomain(hostnameOf(active?.url), blockedDomains)) return true;
  } catch {
    /* no window focused */
  }

  // 2. The last blocked-domain focus, if it was within the window.
  const stored = await chrome.storage.session.get(FOCUS_KEY);
  const at = stored[FOCUS_KEY] as number | undefined;
  return typeof at === 'number' && Date.now() - at <= RECENT_ACTIVITY_WINDOW_MS;
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  void bootstrap();
  // Send the parent straight to setup on first install.
  try {
    chrome.runtime.openOptionsPage();
  } catch {
    /* options page not available yet */
  }
});

chrome.runtime.onStartup.addListener(() => {
  void bootstrap();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) void syncOnce();
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await noteFocusedTab(tab.url);
  } catch {
    /* tab gone */
  }
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) void noteFocusedTab(tab.url);
});

chrome.runtime.onMessage.addListener(
  (message: ExtMessage, _sender, sendResponse: (r: ExtResponse) => void) => {
    switch (message.type) {
      case 'CHECK_RECENT_BLOCKED_ACTIVITY':
        void wasRecentlyOnBlockedSite().then((flagged) =>
          sendResponse({ type: 'RECENT_BLOCKED_ACTIVITY', flagged }),
        );
        return true;
      case 'RESYNC':
        void syncOnce().then(
          () => sendResponse({ type: 'OK' }),
          (error: Error) => sendResponse({ type: 'ERROR', message: error.message }),
        );
        return true;
      default:
        sendResponse({ type: 'ERROR', message: 'Unknown message' });
        return false;
    }
  },
);

async function bootstrap(): Promise<void> {
  // Rules first, from cache — the gate should hold before the network is up.
  await applyFromCache();
  await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_ALARM_MINUTES });

  if (!isFirebaseConfigured) return;
  onAuthStateChanged(childAuth(), (user) => {
    if (!user) {
      detachListeners();
      return;
    }
    void attachListeners(user);
    void syncOnce();
  });
}

// The worker is also started by events other than onInstalled/onStartup
// (an alarm, a message, a tab update), so bootstrap unconditionally too.
void bootstrap();
