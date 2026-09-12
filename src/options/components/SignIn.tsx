import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { parentAuth } from '../../firebase';

export function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const auth = parentAuth();
      if (mode === 'up') await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError((e as Error).message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email) return setError('Enter your email first.');
    try {
      await sendPasswordResetEmail(parentAuth(), email);
      setNote('Reset email sent.');
    } catch (e) {
      setError((e as Error).message.replace('Firebase: ', ''));
    }
  };

  return (
    <div className="gate">
      <div className="gate-card card">
        <div className="gate-icon" aria-hidden="true">👋</div>
        <h1>{mode === 'in' ? 'Parent sign in' : 'Create a parent account'}</h1>
        <p className="muted tiny">This account owns your household's data.</p>

        <div className="stack" style={{ width: '100%' }}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            />
          </div>
        </div>

        {error && <div className="notice warm tiny">{error}</div>}
        {note && <div className="notice tiny">{note}</div>}

        <button disabled={busy} onClick={() => void submit()}>
          {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
        <div className="row tiny" style={{ justifyContent: 'center', gap: 14 }}>
          <a href="#" onClick={(e) => (e.preventDefault(), setMode(mode === 'in' ? 'up' : 'in'))}>
            {mode === 'in' ? 'Create an account' : 'I already have an account'}
          </a>
          {mode === 'in' && (
            <a href="#" onClick={(e) => (e.preventDefault(), void reset())}>
              Forgot password
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
