import { useState } from 'react';
import { getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { childAuth, childDb } from '../../firebase';
import { childLinkDoc, pairingCodeDoc } from '../../lib/paths';
import { sendToBackground } from '../../lib/messages';

/**
 * First run on the child's browser. The parent generates a code in the options
 * page; entering it here links this anonymous identity to exactly one child.
 */
export function Pairing() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) {
      setError('That code looks too short.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const db = childDb();
      const user = childAuth().currentUser;
      if (!user) throw new Error('Still connecting — try again in a moment.');

      const codeSnap = await getDoc(pairingCodeDoc(db, normalized));
      if (!codeSnap.exists()) throw new Error('We could not find that code.');
      const data = codeSnap.data() as {
        householdId: string;
        childId: string;
        usedBy: string | null;
        expiresAt: number;
      };
      if (data.usedBy) throw new Error('That code has already been used.');
      if (data.expiresAt < Date.now()) throw new Error('That code has expired — ask for a new one.');

      await setDoc(childLinkDoc(db, user.uid), {
        householdId: data.householdId,
        childId: data.childId,
        pairingCode: normalized,
        createdAt: Date.now(),
      });
      await updateDoc(pairingCodeDoc(db, normalized), { usedBy: user.uid, usedAt: Date.now() });
      await sendToBackground({ type: 'RESYNC' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack pairing">
      <div className="empty card">
        <div className="empty-emoji">👋</div>
        <strong>Let's get you set up</strong>
        <p className="muted tiny">Enter the code from your parent's dashboard.</p>
      </div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
        placeholder="ABC123"
        maxLength={8}
        className="code-input"
        aria-label="Pairing code"
      />
      {error && <div className="notice warm tiny">{error}</div>}
      <button disabled={busy} onClick={() => void submit()}>
        {busy ? 'Connecting…' : 'Connect'}
      </button>
    </div>
  );
}
