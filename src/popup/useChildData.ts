import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { childAuth, childDb } from '../firebase';
import {
  childBadgesCol,
  childDoc,
  childLinkDoc,
  childrenCol,
  householdDoc,
  redemptionsCol,
  rewardsCol,
  tasksCol,
} from '../lib/paths';
import { isFirebaseConfigured } from '../config';
import type { Child, ChildLink, EarnedBadge, Household, Redemption, Reward, Task } from '@shared/types';

export interface ChildData {
  ready: boolean;
  configured: boolean;
  user: User | null;
  link: ChildLink | null;
  household: Household | null;
  child: Child | null;
  siblings: Child[];
  tasks: Task[];
  earnedBadges: EarnedBadge[];
  rewards: Reward[];
  redemptions: Redemption[];
  error: string | null;
}

const EMPTY: ChildData = {
  ready: false,
  configured: isFirebaseConfigured,
  user: null,
  link: null,
  household: null,
  child: null,
  siblings: [],
  tasks: [],
  earnedBadges: [],
  rewards: [],
  redemptions: [],
  error: null,
};

export function useChildData(): ChildData {
  const [state, setState] = useState<ChildData>(EMPTY);
  const patch = (p: Partial<ChildData>) => setState((s) => ({ ...s, ...p }));

  // 1. Make sure we have an anonymous identity.
  useEffect(() => {
    if (!isFirebaseConfigured) {
      patch({ ready: true, configured: false });
      return;
    }
    const auth = childAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        patch({ user });
        return;
      }
      signInAnonymously(auth).catch((e: Error) => patch({ ready: true, error: e.message }));
    });
    return unsub;
  }, []);

  // 2. Resolve the pairing link for this device.
  useEffect(() => {
    if (!state.user) return;
    return onSnapshot(
      childLinkDoc(childDb(), state.user.uid),
      (snap) => {
        if (!snap.exists()) {
          patch({ ready: true, link: null });
          return;
        }
        patch({ link: snap.data() as ChildLink });
      },
      (e) => patch({ ready: true, error: e.message }),
    );
  }, [state.user?.uid]);

  // 3. Subscribe to everything this child is allowed to see.
  const hid = state.link?.householdId;
  const cid = state.link?.childId;
  useEffect(() => {
    if (!hid || !cid) return;
    const db = childDb();
    const fail = (e: Error) => patch({ ready: true, error: e.message });

    const unsubs = [
      onSnapshot(
        householdDoc(db, hid),
        (s) => patch({ household: s.exists() ? ({ id: s.id, ...s.data() } as Household) : null, ready: true }),
        fail,
      ),
      onSnapshot(
        childDoc(db, hid, cid),
        (s) => patch({ child: s.exists() ? ({ id: s.id, ...s.data() } as Child) : null }),
        fail,
      ),
      onSnapshot(
        childrenCol(db, hid),
        (s) => patch({ siblings: s.docs.map((d) => ({ id: d.id, ...d.data() }) as Child) }),
        fail,
      ),
      onSnapshot(
        query(tasksCol(db, hid), where('childId', '==', cid), orderBy('createdAt', 'desc')),
        (s) => patch({ tasks: s.docs.map((d) => ({ id: d.id, ...d.data() }) as Task) }),
        fail,
      ),
      onSnapshot(
        childBadgesCol(db, hid, cid),
        (s) => patch({ earnedBadges: s.docs.map((d) => ({ key: d.id, ...d.data() }) as EarnedBadge) }),
        fail,
      ),
      onSnapshot(
        rewardsCol(db, hid),
        (s) => patch({ rewards: s.docs.map((d) => ({ id: d.id, ...d.data() }) as Reward) }),
        fail,
      ),
      onSnapshot(
        query(redemptionsCol(db, hid), where('childId', '==', cid)),
        (s) => patch({ redemptions: s.docs.map((d) => ({ id: d.id, ...d.data() }) as Redemption) }),
        fail,
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [hid, cid]);

  return useMemo(() => state, [state]);
}
