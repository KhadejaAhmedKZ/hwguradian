import { useEffect, useState } from 'react';
import { getCachedState, type CachedState } from '../lib/storage';
import { childFunctions } from '../firebase';
import { runTextAgent } from '../lib/agents';
import { FALLBACK_ENCOURAGEMENT } from '../lib/gemini';
import { isFirebaseConfigured } from '../config';

/**
 * The page a blocked domain redirects to. Tone matters here: this is the screen
 * the child sees most often, so it stays encouraging and never scolds.
 */
export function Blocked() {
  const [state, setState] = useState<CachedState | null>(null);
  const [line, setLine] = useState<string>('');

  useEffect(() => {
    void getCachedState().then(setState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const cache = await chrome.storage.local.get('encouragement');
      const cached = cache.encouragement as { day: string; text: string } | undefined;
      if (cached?.day === today) {
        if (!cancelled) setLine(cached.text);
        return;
      }
      const fallback =
        FALLBACK_ENCOURAGEMENT[Math.floor(Math.random() * FALLBACK_ENCOURAGEMENT.length)]!;
      if (!isFirebaseConfigured) {
        if (!cancelled) setLine(fallback);
        return;
      }
      try {
        const lines = await runTextAgent(childFunctions(), 'coach', {});
        const text = lines[0] ?? fallback;
        if (!cancelled) setLine(text);
        await chrome.storage.local.set({ encouragement: { day: today, text } });
      } catch {
        if (!cancelled) setLine(fallback);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tasks = state?.openTasks ?? [];
  const toDo = tasks.filter((t) => t.status === 'pending');
  const waiting = tasks.filter((t) => t.status === 'pending_approval');
  const points = tasks.reduce((sum, t) => sum + t.pointsValue, 0);

  return (
    <main className="blocked-wrap">
      <section className="blocked-card card animate-in">
        <div className="blocked-emoji" aria-hidden="true">🌤️</div>
        <h1>Almost there{state?.childName ? `, ${state.childName}` : ''}</h1>
        <p className="blocked-line">{line || 'This site opens back up once your tasks are done.'}</p>

        {toDo.length > 0 && (
          <>
            <h2 className="blocked-subtitle">Still to do</h2>
            <ul className="blocked-tasks">
              {toDo.map((task) => (
                <li key={task.id} className="blocked-task">
                  <span className="grow">{task.title}</span>
                  <span className="pill brand">+{task.pointsValue} pts</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {waiting.length > 0 && (
          <>
            <h2 className="blocked-subtitle">Done — waiting for a parent</h2>
            <ul className="blocked-tasks">
              {waiting.map((task) => (
                <li key={task.id} className="blocked-task waiting">
                  <span className="grow">{task.title}</span>
                  <span className="pill warm">⏳</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {tasks.length === 0 && (
          <p className="muted">
            Nothing is listed here yet. Open the HW Guardian icon in your toolbar to check.
          </p>
        )}

        <div className="blocked-footer">
          <span className="pill good">{points} pts waiting for you</span>
          <button onClick={() => location.reload()}>I'm done — check again</button>
        </div>
      </section>
      <p className="tiny muted blocked-hint">
        Open the HW Guardian icon in your toolbar to tick things off.
      </p>
    </main>
  );
}
