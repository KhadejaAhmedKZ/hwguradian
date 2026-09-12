import type { AgentVerdict, Child, GatePolicy, Task } from '@shared/types';
import { nextBadgeProgress } from '@shared/awards';
import { BADGE_BY_KEY } from '@shared/badges';
import { TaskList } from './TaskList';

interface Props {
  child: Child;
  tasks: Task[];
  earnedKeys: string[];
  gatePolicy: GatePolicy;
  onMarkDone: (task: Task) => Promise<void>;
  onVerify: (task: Task, evidence: string) => Promise<AgentVerdict>;
}

function greeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Morning, ${name}!`;
  if (hour < 18) return `Hey, ${name}!`;
  return `Evening, ${name}!`;
}

export function Home({ child, tasks, earnedKeys, gatePolicy, onMarkDone, onVerify }: Props) {
  const progress = nextBadgeProgress(child, earnedKeys);
  const open = tasks.filter((t) => t.status !== 'approved').length;

  return (
    <div className="stack">
      <header className="hero card">
        <div className="hero-top">
          <div className="avatar" aria-hidden="true">{child.avatarEmoji || '🙂'}</div>
          <div className="grow">
            <h1 className="hero-greeting">{greeting(child.name)}</h1>
            <p className="tiny muted" style={{ margin: '2px 0 0' }}>
              {open === 0
                ? 'Nothing left to do. Nice work!'
                : `${open} task${open === 1 ? '' : 's'} to go — you've got this.`}
            </p>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat">
            <div className="stat-value">{child.totalPoints}</div>
            <div className="stat-label">points</div>
          </div>
          <div className="stat">
            <div className="stat-value flame-value">
              <span className="flame" aria-hidden="true">🔥</span>
              {child.currentStreak}
            </div>
            <div className="stat-label">day streak</div>
          </div>
          <div className="stat">
            <div className="stat-value">{child.tasksApproved}</div>
            <div className="stat-label">all-time</div>
          </div>
        </div>

        {progress && (
          <div className="progress-block">
            <div className="spread tiny">
              <span>
                {BADGE_BY_KEY[progress.badge.key]?.icon} Next: <strong>{progress.badge.name}</strong>
              </span>
              <span className="muted">
                {progress.value}/{progress.target}
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.round((progress.value / progress.target) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <TaskList
        tasks={tasks}
        gatePolicy={gatePolicy}
        onMarkDone={onMarkDone}
        onVerify={onVerify}
      />
    </div>
  );
}
