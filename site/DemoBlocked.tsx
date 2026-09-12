import { useEffect, useState } from 'react';
import { initialTasks } from './demoData';

/**
 * A static rendering of blocked-page.html. It mirrors src/blocked/Blocked.tsx
 * but reads the demo task list directly, since the real page reads
 * chrome.storage and calls the encouragement function.
 */
export function DemoBlocked() {
  const [line, setLine] = useState('Almost there — one task and you are back.');

  useEffect(() => {
    const lines = [
      'Almost there — one task and you are back.',
      'You have got this. Knock one out.',
      'Small push now, free time after.',
    ];
    const id = window.setInterval(
      () => setLine(lines[Math.floor(Math.random() * lines.length)]!),
      4200,
    );
    return () => window.clearInterval(id);
  }, []);

  const open = initialTasks.filter((t) => t.status !== 'approved');
  const toDo = open.filter((t) => t.status === 'pending');
  const waiting = open.filter((t) => t.status === 'pending_approval');
  const points = open.reduce((sum, t) => sum + t.pointsValue, 0);

  return (
    <section className="blocked-card card demo-blocked">
      <div className="blocked-emoji" aria-hidden="true">🌤️</div>
      <h1>Almost there, Yusuf</h1>
      <p className="blocked-line">{line}</p>

      <h2 className="blocked-subtitle">Still to do</h2>
      <ul className="blocked-tasks">
        {toDo.map((t) => (
          <li key={t.id} className="blocked-task">
            <span className="grow">{t.title}</span>
            <span className="pill brand">+{t.pointsValue} pts</span>
          </li>
        ))}
      </ul>

      <h2 className="blocked-subtitle">Done — waiting for a parent</h2>
      <ul className="blocked-tasks">
        {waiting.map((t) => (
          <li key={t.id} className="blocked-task waiting">
            <span className="grow">{t.title}</span>
            <span className="pill warm">⏳</span>
          </li>
        ))}
      </ul>

      <div className="blocked-footer">
        <span className="pill good">{points} pts waiting for you</span>
        <button type="button">I'm done — check again</button>
      </div>
    </section>
  );
}
