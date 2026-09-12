import { useState } from 'react';
import { Home } from '../src/popup/components/Home';
import { BadgeCase } from '../src/popup/components/BadgeCase';
import { Shop } from '../src/popup/components/Shop';
import { Leaderboard } from '../src/popup/components/Leaderboard';
import { earnedBadges, initialRedemptions, initialTasks, me, rewards, sibling } from './demoData';
import type { AgentVerdict, Redemption, Reward, Task } from '@shared/types';

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

  /**
   * A stand-in for the server-side verifier agent, so the demo can show the
   * shape of the interaction. The real one runs in a Cloud Function and writes
   * its verdict where no client can reach it.
   */
  const verify = async (task: Task, evidence: string): Promise<AgentVerdict> => {
    await new Promise((r) => setTimeout(r, 700));
    const detailed = evidence.trim().split(/\s+/).length >= 6;
    const verdict: AgentVerdict = detailed
      ? {
          state: 'pass',
          reason: 'That covers it — nice and specific.',
          followUp: null,
          checkedAt: Date.now(),
          agentId: 'chore_verifier',
          model: 'demo',
        }
      : {
          state: 'needs_more',
          reason: "I can't tell yet whether it's finished.",
          followUp: 'What did you do with the clothes on the floor?',
          checkedAt: Date.now(),
          agentId: 'chore_verifier',
          model: 'demo',
        };
    setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, agentVerdict: verdict } : t)));
    return verdict;
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
          <Home
            child={me}
            tasks={tasks}
            earnedKeys={earnedKeys}
            gatePolicy="agent_unlock"
            onMarkDone={markDone}
            onVerify={verify}
          />
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
