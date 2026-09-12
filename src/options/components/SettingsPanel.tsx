import { useState } from 'react';
import { signOut } from 'firebase/auth';
import type { Household } from '@shared/types';
import { parentAuth } from '../../firebase';
import { setLeaderboardMetric } from '../../lib/parentActions';
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
