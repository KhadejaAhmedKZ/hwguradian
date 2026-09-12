import { useState } from 'react';
import { useChildData } from './useChildData';
import { Home } from './components/Home';
import { BadgeCase } from './components/BadgeCase';
import { Shop } from './components/Shop';
import { Leaderboard } from './components/Leaderboard';
import { Pairing } from './components/Pairing';
import { markTaskDone, requestReward, submitForVerification } from '../lib/childActions';
import type { Reward, Task } from '@shared/types';

type Tab = 'home' | 'badges' | 'shop' | 'board';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Tasks', icon: '📋' },
  { id: 'badges', label: 'Badges', icon: '🎖️' },
  { id: 'shop', label: 'Shop', icon: '🎁' },
  { id: 'board', label: 'Board', icon: '🏅' },
];

export function App() {
  const data = useChildData();
  const [tab, setTab] = useState<Tab>('home');

  if (!data.configured) {
    return (
      <div className="shell">
        <div className="empty card">
          <div className="empty-emoji">🔧</div>
          <strong>Almost ready</strong>
          <p className="muted tiny">
            Firebase isn't configured yet. Add your project details to <code>.env.local</code> and
            rebuild.
          </p>
        </div>
      </div>
    );
  }

  if (!data.ready) {
    return (
      <div className="shell center">
        <div className="loader" aria-label="Loading" />
      </div>
    );
  }

  if (!data.link) {
    return (
      <div className="shell">
        <Pairing />
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="shell">
        <div className="notice warm">{data.error}</div>
      </div>
    );
  }

  if (!data.child || !data.household) {
    return (
      <div className="shell center">
        <div className="loader" aria-label="Loading" />
      </div>
    );
  }

  const householdId = data.household.id;
  const earnedKeys = data.earnedBadges.map((b) => b.key);

  const onMarkDone = (task: Task) => markTaskDone(householdId, task);
  const onVerify = (task: Task, evidence: string) => submitForVerification(task.id, evidence);
  const onRedeem = (reward: Reward) => requestReward(householdId, data.child!, reward);

  return (
    <div className="shell">
      <div className="tab-body">
        {tab === 'home' && (
          <Home
            child={data.child}
            tasks={data.tasks}
            earnedKeys={earnedKeys}
            gatePolicy={data.household.gatePolicy ?? 'parent_only'}
            onMarkDone={onMarkDone}
            onVerify={onVerify}
          />
        )}
        {tab === 'badges' && <BadgeCase earned={data.earnedBadges} />}
        {tab === 'shop' && (
          <Shop
            child={data.child}
            rewards={data.rewards}
            redemptions={data.redemptions}
            onRedeem={onRedeem}
          />
        )}
        {tab === 'board' && (
          <Leaderboard
            children={data.siblings}
            meId={data.child.id}
            defaultMetric={data.household.leaderboardMetric ?? 'points'}
          />
        )}
      </div>

      <nav className="tabbar" aria-label="Sections">
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
