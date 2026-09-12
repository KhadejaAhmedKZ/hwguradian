import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { parentAuth, parentDb } from '../firebase';
import {
  childrenCol,
  choresCol,
  householdsCol,
  redemptionsCol,
  rewardsCol,
  tasksCol,
} from '../lib/paths';
import type { Child, Chore, Household, Redemption, Reward, Task } from '@shared/types';

export interface ParentData {
  authReady: boolean;
  user: User | null;
  households: Household[];
  household: Household | null;
  children: Child[];
  tasks: Task[];
  chores: Chore[];
  rewards: Reward[];
  redemptions: Redemption[];
  error: string | null;
  selectHousehold: (id: string) => void;
}

export function useParentData(): ParentData {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(parentAuth(), (u) => {
        setUser(u);
        setAuthReady(true);
      }),
    [],
  );

  useEffect(() => {
    if (!user) {
      setHouseholds([]);
      setSelectedId(null);
      return;
    }
    return onSnapshot(
      query(householdsCol(parentDb()), where('parentUid', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Household);
        setHouseholds(list);
        setSelectedId((current) => current ?? list[0]?.id ?? null);
      },
      (e) => setError(e.message),
    );
  }, [user?.uid]);

  const hid = selectedId;
  useEffect(() => {
    if (!hid) {
      setChildren([]);
      setTasks([]);
      setChores([]);
      setRewards([]);
      setRedemptions([]);
      return;
    }
    const db = parentDb();
    const fail = (e: Error) => setError(e.message);
    const unsubs = [
      onSnapshot(
        childrenCol(db, hid),
        (s) => setChildren(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Child)),
        fail,
      ),
      onSnapshot(
        query(tasksCol(db, hid), orderBy('createdAt', 'desc')),
        (s) => setTasks(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Task)),
        fail,
      ),
      onSnapshot(
        query(choresCol(db, hid), orderBy('createdAt', 'desc')),
        (s) => setChores(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Chore)),
        fail,
      ),
      onSnapshot(
        rewardsCol(db, hid),
        (s) => setRewards(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Reward)),
        fail,
      ),
      onSnapshot(
        redemptionsCol(db, hid),
        (s) => setRedemptions(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Redemption)),
        fail,
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [hid]);

  return {
    authReady,
    user,
    households,
    household: households.find((h) => h.id === selectedId) ?? null,
    children,
    tasks,
    chores,
    rewards,
    redemptions,
    error,
    selectHousehold: setSelectedId,
  };
}
