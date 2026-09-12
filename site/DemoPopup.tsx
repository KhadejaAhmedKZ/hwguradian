import { useState } from 'react';
import { Home } from '../src/popup/components/Home';
import { BadgeCase } from '../src/popup/components/BadgeCase';
import { Shop } from '../src/popup/components/Shop';
import { Leaderboard } from '../src/popup/components/Leaderboard';
import { earnedBadges, initialRedemptions, initialTasks, me, rewards, sibling } from './demoData';
import type { Redemption, Reward, Task } from '@shared/types';

type Tab = 'home' | 'badges' | 'shop' | 'board';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Tasks', icon: '📋' },
  { id: 'badges', label: 'Badges', icon: '🎖️' },
  { id: 'shop', label: 'Shop', icon: '🎁' },
  { id: 'board', label: 'Board', icon: '🏅' },
];

/**
 * The real popup components, driven by local state instead of Firestore.
 * Marking a task done flips it to "waiting for approval" exactly as it would
 * in the extension — approval itself is a parent action and cannot happen here.
 */
export function DemoPopup() {
  const [tab, setTab] = useState<Tab>('home');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [redemptions, setRedemptions] = useState<Redemption[]>(initialRedemptions);

  const markDone = async (task: Task) => {
    await new Promise((r) => setTimeout(r, 260));
    setTasks((list) =>
      list.map((t) => (t.id === task.id ? { ...t, status: 'pending_approval' as const } : t)),
    );
  };

  const redeem = async (reward: Reward) => {
    setRedemptions((list) => [
      ...list,
      {
        id: `demo-${reward.id}`, childId: me.id, rewardId: reward.id,
        rewardTitle: reward.title, pointCost: reward.pointCost,
        status: 'requested', requestedAt: Date.now(), grantedAt: null,
      },
    ]);
  };

  const earnedKeys = earnedBadges.map((b) => b.key);

  return (
    <div className="shell demo-shell">
      <div className="tab-body">
        {tab === 'home' && (
          <Home child={me} tasks={tasks} earnedKeys={earnedKeys} onMarkDone={markDone} />
        )}
        {tab === 'badges' && <BadgeCase earned={earnedBadges} />}
        {tab === 'shop' && (
          <Shop child={me} rewards={rewards} redemptions={redemptions} onRedeem={redeem} />
        )}
        {tab === 'board' && (
          <Leaderboard children={[me, sibling]} meId={me.id} defaultMetric="points" />
        )}
      </div>
      <nav className="tabbar" aria-label="Demo sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
          >
            <span aria-hidden="true">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
