import { collection, doc, type Firestore } from 'firebase/firestore';

export const householdsCol = (db: Firestore) => collection(db, 'households');
export const householdDoc = (db: Firestore, hid: string) => doc(db, 'households', hid);

export const childrenCol = (db: Firestore, hid: string) =>
  collection(db, 'households', hid, 'children');
export const childDoc = (db: Firestore, hid: string, cid: string) =>
  doc(db, 'households', hid, 'children', cid);

export const childBadgesCol = (db: Firestore, hid: string, cid: string) =>
  collection(db, 'households', hid, 'children', cid, 'badges');

export const tasksCol = (db: Firestore, hid: string) =>
  collection(db, 'households', hid, 'tasks');
export const taskDoc = (db: Firestore, hid: string, tid: string) =>
  doc(db, 'households', hid, 'tasks', tid);

export const rewardsCol = (db: Firestore, hid: string) =>
  collection(db, 'households', hid, 'rewards');
export const rewardDoc = (db: Firestore, hid: string, rid: string) =>
  doc(db, 'households', hid, 'rewards', rid);

export const redemptionsCol = (db: Firestore, hid: string) =>
  collection(db, 'households', hid, 'redemptions');
export const redemptionDoc = (db: Firestore, hid: string, rid: string) =>
  doc(db, 'households', hid, 'redemptions', rid);

export const childLinkDoc = (db: Firestore, uid: string) => doc(db, 'childLinks', uid);
export const pairingCodeDoc = (db: Firestore, code: string) => doc(db, 'pairingCodes', code);
