import { useState } from 'react';
import { signOut } from 'firebase/auth';
import type { Household } from '@shared/types';
import { parentAuth } from '../../firebase';
import { setGatePolicy, setLeaderboardMetric, setScreenTimeEnabled } from '../../lib/parentActions';
import { AGENT_INFO } from '../../lib/agentInfo';
import { isValidPinFormat, savePin, verifyPin } from '../../lib/pin';

export function SettingsPanel({ household, onLock }: { household: Household; onLock: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changePin = async () => {
    setNote(null);
    setError(null);
    if (!(await verifyPin(current))) return setError('Current PIN is wrong.');
    if (!isValidPinFormat(next)) return setError('New PIN must be 4–6 digits.');
    await savePin(next);
    setCurrent('');
    setNext('');
    setNote('PIN updated.');
  };

  return (
    <div className="stack">
      <section className="card panel">
        <h2>What reopens the blocked sites</h2>
        <p className="muted tiny" style={{ marginTop: 0 }}>
          Points always wait for you either way. This only decides how fast the sites come back.
        </p>
        <div className="policy-choice">
          <button
            className={`policy ${household.gatePolicy === 'parent_only' ? 'on' : ''}`}
            onClick={() => void setGatePolicy(household.id, 'parent_only')}
          >
            <strong>Only me</strong>
            <span>
              Sites stay blocked until you approve the task yourself. Strictest, and the default.
            </span>
          </button>
          <button
            className={`policy ${household.gatePolicy === 'agent_unlock' ? 'on' : ''}`}
            onClick={() => void setGatePolicy(household.id, 'agent_unlock')}
          >
            <strong>The verifier agent can</strong>
            <span>
              If the agent reads the child's written note and thinks the chore is done, sites
              reopen immediately. The task still waits in your queue, and no points move until you
              approve it.
            </span>
          </button>
        </div>
        <div className="notice tiny" style={{ marginTop: 12 }}>
          Worth knowing before you pick the second one: the agent reads what the child{' '}
          <em>wrote</em>. It cannot see the room, so a convincing description of a chore that never
          happened will pass. It stops vague answers, not determined ones.
        </div>
      </section>

      <section className="card panel">
        <h2>Agents</h2>
        <p className="muted tiny" style={{ marginTop: 0 }}>
          All three run on the server, never in the child's browser — an agent's answer is only
          worth something if the device can't write it itself.
        </p>
        <ul className="plain-list stack">
          {AGENT_INFO.map((agent) => (
            <li key={agent.id} className="list-row agent-row">
              <span className="agent-icon" aria-hidden="true">{agent.icon}</span>
              <span className="grow">
                <strong>{agent.label}</strong>
                <span className="tiny muted chore-meta">{agent.description}</span>
              </span>
              <span className="pill">{agent.caller}</span>
            </li>
          ))}
        </ul>
        <div className="notice tiny" style={{ marginTop: 12 }}>
          No agent can approve a task, move a point, change a streak or award a badge. Those are
          parent-only actions, enforced in the Firestore rules rather than by prompt.
        </div>
      </section>

      <section className="card panel">
        <h2>Screen time</h2>
        <p className="muted tiny" style={{ marginTop: 0 }}>
          {household.screenTimeEnabled
            ? 'Recording seconds per domain per day on the child\'s browser. No URLs, titles or page content.'
            : 'Off. Nothing about time spent is recorded.'}
        </p>
        <div className="row">
          <button
            className={household.screenTimeEnabled ? '' : 'ghost'}
            onClick={() => void setScreenTimeEnabled(household.id, true)}
          >
            On
          </button>
          <button
            className={household.screenTimeEnabled ? 'ghost' : ''}
            onClick={() => void setScreenTimeEnabled(household.id, false)}
          >
            Off
          </button>
        </div>
      </section>

      <section className="card panel">
        <h2>Leaderboard</h2>
        <p className="muted tiny" style={{ marginTop: 0 }}>
          Sets the default ranking children see. It is scoped to this household and never leaves it.
        </p>
        <div className="row">
          <button
            className={household.leaderboardMetric === 'points' ? '' : 'ghost'}
            onClick={() => void setLeaderboardMetric(household.id, 'points')}
          >
            Points
          </button>
          <button
            className={household.leaderboardMetric === 'streak' ? '' : 'ghost'}
            onClick={() => void setLeaderboardMetric(household.id, 'streak')}
          >
            Streak
          </button>
        </div>
      </section>

      <section className="card panel">
        <h2>Household</h2>
        <ul className="plain-list tiny muted stack">
          <li>Name: {household.name}</li>
          <li>Timezone: {household.timezone} — streaks and the early-bird badge use this.</li>
          <li>Household ID: <code>{household.id}</code></li>
        </ul>
      </section>

      <section className="card panel">
        <h2>Change parent PIN</h2>
        <div className="form-row">
          <div>
            <label htmlFor="pin-current">Current</label>
            <input
              id="pin-current"
              type="password"
              inputMode="numeric"
              value={current}
              maxLength={6}
              onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div>
            <label htmlFor="pin-next">New</label>
            <input
              id="pin-next"
              type="password"
              inputMode="numeric"
              value={next}
              maxLength={6}
              onChange={(e) => setNext(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <button className="ghost" onClick={() => void changePin()}>
            Update PIN
          </button>
        </div>
        {note && <div className="notice tiny">{note}</div>}
        {error && <div className="notice warm tiny">{error}</div>}
      </section>

      <section className="card panel">
        <h2>Session</h2>
        <div className="row">
          <button className="ghost" onClick={onLock}>
            Lock dashboard
          </button>
          <button
            className="danger"
            onClick={() => {
              void signOut(parentAuth()).then(onLock);
            }}
          >
            Sign out
          </button>
        </div>
        <p className="muted tiny">
          Signing out only affects the parent account. The child's popup keeps working.
        </p>
      </section>
    </div>
  );
}
