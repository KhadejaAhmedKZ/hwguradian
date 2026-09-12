// Parent-side writes. Everything here runs as the authenticated parent account;
// Firestore rules reject the same calls from a child identity.

import {
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  increment,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { parentDb } from '../firebase';
import {
  childDoc,
  childrenCol,
  householdDoc,
  householdsCol,
  pairingCodeDoc,
  redemptionDoc,
  rewardDoc,
  rewardsCol,
  taskDoc,
  tasksCol,
} from './paths';
import type { LeaderboardMetric } from '@shared/types';

const PAIRING_CODE_TTL_MS = 24 * 60 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1

export async function createHousehold(name: string, parentUid: string): Promise<string> {
  const ref = await addDoc(householdsCol(parentDb()), {
    name,
    parentUid,
    blockedDomains: [],
    leaderboardMetric: 'points' as LeaderboardMetric,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function addChild(hid: string, name: string, avatarEmoji: string): Promise<string> {
  const ref = await addDoc(childrenCol(parentDb(), hid), {
    name,
    avatarEmoji,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
    tasksApproved: 0,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function removeChild(hid: string, cid: string): Promise<void> {
  await deleteDoc(childDoc(parentDb(), hid, cid));
}

/** One-time, 24h code the child types into the popup on their browser. */
export async function createPairingCode(hid: string, cid: string): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  await setDoc(pairingCodeDoc(parentDb(), code), {
    householdId: hid,
    childId: cid,
    usedBy: null,
    usedAt: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + PAIRING_CODE_TTL_MS,
  });
  return code;
}

export async function createTask(
  hid: string,
  childId: string,
  title: string,
  pointsValue: number,
): Promise<void> {
  await addDoc(tasksCol(parentDb(), hid), {
    childId,
    title,
    pointsValue,
    status: 'pending',
    createdAt: Date.now(),
    submittedAt: null,
    approvedAt: null,
    flaggedRecentBlockedActivity: false,
    pointsCredited: false,
  });
}

export async function deleteTask(hid: string, tid: string): Promise<void> {
  await deleteDoc(taskDoc(parentDb(), hid, tid));
}

/**
 * Approve. Points, streak and badges are applied by the `onTaskApproved`
 * Cloud Function — deliberately not here, so the numbers can only ever be
 * written by trusted server code.
 */
export async function approveTask(hid: string, tid: string): Promise<void> {
  await updateDoc(taskDoc(parentDb(), hid, tid), {
    status: 'approved',
    approvedAt: Date.now(),
  });
}

/** Send a task back to the child. No points are lost; nothing is punished. */
export async function sendTaskBack(hid: string, tid: string): Promise<void> {
  await updateDoc(taskDoc(parentDb(), hid, tid), {
    status: 'pending',
    submittedAt: null,
  });
}

export async function awardBonusPoints(hid: string, cid: string, points: number): Promise<void> {
  await updateDoc(childDoc(parentDb(), hid, cid), { totalPoints: increment(points) });
}

export async function createReward(hid: string, title: string, pointCost: number): Promise<void> {
  await addDoc(rewardsCol(parentDb(), hid), {
    title,
    pointCost,
    active: true,
    createdAt: Date.now(),
  });
}

export async function setRewardActive(hid: string, rid: string, active: boolean): Promise<void> {
  await updateDoc(rewardDoc(parentDb(), hid, rid), { active });
}

export async function deleteReward(hid: string, rid: string): Promise<void> {
  await deleteDoc(rewardDoc(parentDb(), hid, rid));
}

export async function grantRedemption(hid: string, rid: string): Promise<void> {
  await updateDoc(redemptionDoc(parentDb(), hid, rid), {
    status: 'granted',
    grantedAt: Date.now(),
  });
}

/** Declining refunds the points — handled by `onRedemptionResolved`. */
export async function declineRedemption(hid: string, rid: string): Promise<void> {
  await updateDoc(redemptionDoc(parentDb(), hid, rid), { status: 'declined' });
}

export async function setBlockedDomains(hid: string, domains: string[]): Promise<void> {
  await updateDoc(householdDoc(parentDb(), hid), { blockedDomains: domains });
}

export async function setLeaderboardMetric(hid: string, metric: LeaderboardMetric): Promise<void> {
  await updateDoc(householdDoc(parentDb(), hid), { leaderboardMetric: metric });
}

export async function householdExists(hid: string): Promise<boolean> {
  const snap = await getDoc(doc(parentDb(), 'households', hid));
  return snap.exists();
}
