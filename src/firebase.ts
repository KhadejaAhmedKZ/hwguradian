// Two Firebase app instances share one extension origin on purpose.
//
//   child  (default app) — anonymous auth, long-lived, used by the popup, the
//                          blocked page and the background service worker.
//   parent ('parent' app) — email/password auth, used only by the options page.
//
// Firebase keys its auth persistence by app name, so both sessions coexist
// without clobbering each other. That is what lets the child surface stay
// permanently signed in as an identity that Firestore rules forbid from ever
// approving a task or writing a points value.

import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  indexedDBLocalPersistence,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';
import { firebaseConfig, FUNCTIONS_REGION, USE_EMULATORS } from './config';

const CHILD_APP = '[DEFAULT]';
const PARENT_APP = 'parent';

function app(name: string): FirebaseApp {
  const existing = getApps().find((a) => a.name === name);
  if (existing) return existing;
  return name === CHILD_APP
    ? initializeApp(firebaseConfig)
    : initializeApp(firebaseConfig, name);
}

const authCache = new Map<string, Auth>();
function authFor(name: string): Auth {
  const cached = authCache.get(name);
  if (cached) return cached;
  // indexedDBLocalPersistence is the only persistence available inside an MV3
  // service worker, and it works in extension pages too.
  const instance = initializeAuth(app(name), { persistence: [indexedDBLocalPersistence] });
  if (USE_EMULATORS) {
    connectAuthEmulator(instance, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  authCache.set(name, instance);
  return instance;
}

const dbCache = new Map<string, Firestore>();
function dbFor(name: string): Firestore {
  const cached = dbCache.get(name);
  if (cached) return cached;
  // Long polling: extension service workers don't get a reliable WebChannel.
  const instance = initializeFirestore(app(name), {
    experimentalAutoDetectLongPolling: true,
  });
  if (USE_EMULATORS) connectFirestoreEmulator(instance, '127.0.0.1', 8080);
  dbCache.set(name, instance);
  return instance;
}

const fnCache = new Map<string, Functions>();
function fnFor(name: string): Functions {
  const cached = fnCache.get(name);
  if (cached) return cached;
  const instance = getFunctions(app(name), FUNCTIONS_REGION);
  if (USE_EMULATORS) connectFunctionsEmulator(instance, '127.0.0.1', 5001);
  fnCache.set(name, instance);
  return instance;
}

export const childAuth = () => authFor(CHILD_APP);
export const childDb = () => dbFor(CHILD_APP);
export const childFunctions = () => fnFor(CHILD_APP);

export const parentAuth = () => authFor(PARENT_APP);
export const parentDb = () => dbFor(PARENT_APP);
export const parentFunctions = () => fnFor(PARENT_APP);

export { getApp };
