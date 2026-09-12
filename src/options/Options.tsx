import { useState } from 'react';
import { useParentData } from './useParentData';
import { PinGate } from './components/PinGate';
import { SignIn } from './components/SignIn';
import { ChildrenPanel } from './components/ChildrenPanel';
import { TasksPanel } from './components/TasksPanel';
import { ApprovalsPanel } from './components/ApprovalsPanel';
import { RewardsPanel } from './components/RewardsPanel';
import { DomainsPanel } from './components/DomainsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { createHousehold } from '../lib/parentActions';
import { isFirebaseConfigured } from '../config';

type Tab = 'approvals' | 'tasks' | 'children' | 'rewards' | 'sites' | 'settings';

export function Options() {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>('approvals');
  const [householdName, setHouseholdName] = useState('');
  const [creating, setCreating] = useState(false);
  const data = useParentData();

  if (!isFirebaseConfigured) {
    return (
      <div className="gate">
        <div className="gate-card card">
          <div className="gate-icon" aria-hidden="true">🔧</div>
          <h1>Add your Firebase project</h1>
          <p className="muted tiny">
            Copy <code>.env.example</code> to <code>.env.local</code>, paste your Firebase web app
            config, then run <code>npm run build</code> and reload the extension.
          </p>
        </div>
      </div>
    );
  }

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;
  if (!data.authReady) return <div className="gate"><div className="loader" /></div>;
  if (!data.user) return <SignIn />;

  if (!data.household) {
    return (
      <div className="gate">
        <div className="gate-card card">
          <div className="gate-icon" aria-hidden="true">🏡</div>
          <h1>Name your household</h1>
          <p className="muted tiny">Everything — children, tasks, rewards — lives inside it.</p>
          <input
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="The Ahmed household"
            aria-label="Household name"
          />
          <button
            disabled={creating || !householdName.trim()}
            onClick={() => {
              setCreating(true);
              void createHousehold(householdName.trim(), data.user!.uid).finally(() =>
                setCreating(false),
              );
            }}
          >
            {creating ? 'Creating…' : 'Create household'}
          </button>
        </div>
      </div>
    );
  }

  const hid = data.household.id;
  const needsApproval = data.tasks.filter((t) => t.status === 'pending_approval').length;
  const pendingRewards = data.redemptions.filter((r) => r.status === 'requested').length;

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'approvals', label: 'Approvals', badge: needsApproval },
    { id: 'tasks', label: 'Tasks' },
    { id: 'children', label: 'Children' },
    { id: 'rewards', label: 'Rewards', badge: pendingRewards },
    { id: 'sites', label: 'Blocked sites' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="dash">
      <header className="dash-header">
        <div className="row">
          <span className="logo" aria-hidden="true">🛡️</span>
          <div>
            <h1>{data.household.name}</h1>
            <div className="tiny muted">Signed in as {data.user.email}</div>
          </div>
        </div>
        <button className="ghost small" onClick={() => setUnlocked(false)}>
          Lock
        </button>
      </header>

      {data.error && <div className="notice warm">{data.error}</div>}

      <nav className="dash-tabs" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`dash-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
          >
            {t.label}
            {t.badge ? <span className="tab-badge">{t.badge}</span> : null}
          </button>
        ))}
      </nav>

      <main className="dash-body">
        {tab === 'approvals' && (
          <ApprovalsPanel hid={hid} childrenList={data.children} tasks={data.tasks} />
        )}
        {tab === 'tasks' && (
          <TasksPanel hid={hid} childrenList={data.children} tasks={data.tasks} />
        )}
        {tab === 'children' && <ChildrenPanel hid={hid} children={data.children} />}
        {tab === 'rewards' && (
          <RewardsPanel
            hid={hid}
            childrenList={data.children}
            rewards={data.rewards}
            redemptions={data.redemptions}
          />
        )}
        {tab === 'sites' && <DomainsPanel hid={hid} domains={data.household.blockedDomains ?? []} />}
        {tab === 'settings' && (
          <SettingsPanel household={data.household} onLock={() => setUnlocked(false)} />
        )}
      </main>
    </div>
  );
}
