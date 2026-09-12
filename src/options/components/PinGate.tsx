import { useEffect, useState } from 'react';
import { hasPin, isValidPinFormat, savePin, verifyPin } from '../../lib/pin';

/**
 * The parent dashboard sits behind a local PIN. This is a speed bump against a
 * curious child on the same browser profile, not a security boundary — the real
 * boundary is Firestore rules plus the parent's Firebase account password.
 */
export function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [mode, setMode] = useState<'loading' | 'create' | 'enter'>('loading');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    void hasPin().then((exists) => setMode(exists ? 'enter' : 'create'));
  }, []);

  const create = async () => {
    if (!isValidPinFormat(pin)) return setError('PIN must be 4–6 digits.');
    if (pin !== confirm) return setError('Those two PINs do not match.');
    await savePin(pin);
    onUnlock();
  };

  const enter = async () => {
    if (await verifyPin(pin)) return onUnlock();
    setAttempts((a) => a + 1);
    setPin('');
    setError(attempts >= 2 ? 'Still no luck. Reinstalling the extension resets the PIN.' : 'That PIN did not match.');
  };

  if (mode === 'loading') return null;

  return (
    <div className="gate">
      <div className="gate-card card">
        <div className="gate-icon" aria-hidden="true">🔐</div>
        <h1>{mode === 'create' ? 'Set a parent PIN' : 'Parent dashboard'}</h1>
        <p className="muted tiny">
          {mode === 'create'
            ? 'Pick a 4–6 digit PIN. It is hashed and stored on this device only.'
            : 'Enter your PIN to manage tasks and approvals.'}
        </p>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          maxLength={6}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && mode === 'enter' && void enter()}
          placeholder="••••"
          className="pin-input"
          aria-label="PIN"
        />
        {mode === 'create' && (
          <input
            type="password"
            inputMode="numeric"
            value={confirm}
            maxLength={6}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && void create()}
            placeholder="Confirm"
            className="pin-input"
            aria-label="Confirm PIN"
          />
        )}
        {error && <div className="notice warm tiny">{error}</div>}
        <button onClick={() => void (mode === 'create' ? create() : enter())}>
          {mode === 'create' ? 'Set PIN' : 'Unlock'}
        </button>
      </div>
    </div>
  );
}
