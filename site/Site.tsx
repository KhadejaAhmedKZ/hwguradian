import { DemoPopup } from './DemoPopup';
import { DemoBlocked } from './DemoBlocked';
import { DemoApprovals, DemoChores, DemoScreenTime } from './DemoDashboard';

const REPO = 'https://github.com/KhadejaAhmedKZ/hwguradian';

export function Site() {
  return (
    <div className="site">
      <nav className="site-nav">
        <span className="brand">
          <img src="./icons/icon-128.png" alt="" />
          HW Guardian
        </span>
        <span className="nav-links">
          <a href="#demo">Demo</a>
          <a href="#chores">Chores</a>
          <a href="#agents">Agents</a>
          <a href="#screentime">Screen time</a>
          <a href="#privacy">Privacy</a>
          <a href="#install">Install</a>
          <a href={REPO}>GitHub ↗</a>
        </span>
      </nav>

      <section className="site-hero">
        <span className="eyebrow">Chrome extension · Manifest V3</span>
        <h1>Sites stay closed until the homework is done.</h1>
        <p className="lede">
          HW Guardian blocks the sites you choose while a child still has chores outstanding. An
          agent reads what they say they did and decides whether the sites reopen — but only a
          parent ever awards a point. Chores, streaks, badges and a screen time dashboard come with it.
        </p>
        <div className="cta-row">
          <a className="btn" href={REPO}>
            View on GitHub
          </a>
          <a className="btn secondary" href="#demo">
            Try the demo
          </a>
        </div>
        <p className="caption" style={{ marginTop: 20 }}>
          Not on the Chrome Web Store — you run it yourself, against your own Firebase project.
        </p>
      </section>

      <section className="block wide" id="demo">
        <h2 className="section-heading">The real UI, running right here</h2>
        <p className="section-lede">
          These are the extension's own React components with mock data — not screenshots. Tick a
          task off and watch it flip to "waiting for approval": the child can mark work done, but
          only a parent can approve it, and only approval pays points.
        </p>

        <div className="demo-grid">
          <div>
            <div className="frame">
              <div className="frame-bar">
                <span className="dot" />
                <span className="frame-label">Child popup</span>
              </div>
              <DemoPopup />
            </div>
            <p className="caption">
              <strong>Four tabs:</strong> tasks, badge case, reward shop and a household-only
              scoreboard. No PIN — the child can mark done and request rewards, nothing else.
            </p>
          </div>

          <div>
            <div className="frame blocked-frame">
              <div className="frame-bar">
                <span className="dot" />
                <span className="frame-label">youtube.com → blocked page</span>
              </div>
              <DemoBlocked />
            </div>
            <p className="caption">
              <strong>The screen they see most.</strong> It lists what's outstanding and what it's
              worth. "Almost there", never "you failed" — no shaming copy anywhere in the product.
            </p>
          </div>
        </div>
      </section>

      <section className="block wide" id="chores">
        <h2 className="section-heading">Chores the parent actually controls</h2>
        <p className="section-lede">
          A chore is a template, not a one-off. Set what it is, who does it, what it's worth, and
          which days it repeats — daily, school days, or days you pick. With more than one child it
          can rotate between them. On each due day it becomes a real task in that child's list.
        </p>
        <div className="frame">
          <div className="frame-bar">
            <span className="dot" />
            <span className="frame-label">Parent dashboard → Chores</span>
          </div>
          <div className="frame-body">
            <DemoChores />
          </div>
        </div>
        <p className="caption">
          <strong>"What counts as done"</strong> is the field that matters: it is what the verifier
          agent checks the child's description against, so the more concrete it is, the more useful
          the check.
        </p>
      </section>

      <section className="block wide" id="agents">
        <h2 className="section-heading">An agent decides whether the gate opens</h2>
        <p className="section-lede">
          For chores that need it, the child writes a sentence about what they did. A verifier agent
          reads it against the chore definition the parent wrote, and either reopens the sites or
          asks one specific follow-up question.
        </p>

        <div className="grid two">
          <article className="card tile">
            <span className="ico" aria-hidden="true">🤖</span>
            <h3>What it can do</h3>
            <p>
              Reopen blocked sites the moment a description reads as complete, so a child who
              actually did the work isn't waiting on a parent to get home.
            </p>
          </article>
          <article className="card tile">
            <span className="ico" aria-hidden="true">🔒</span>
            <h3>What it can never do</h3>
            <p>
              Approve a task. Move a point, streak or badge. Those stay parent-only, enforced in
              Firestore rules rather than by asking a prompt nicely.
            </p>
          </article>
        </div>

        <div className="card honest">
          <span aria-hidden="true">⚠️</span>
          <div>
            <strong>The honest limitation.</strong> The agent reads what the child{' '}
            <em>wrote</em> — it cannot see the room, the worksheet or the bin. A convincing
            description of a chore that never happened will pass. It raises the effort of fobbing
            you off from two words to a paragraph; it is not a truth detector, and the product
            never claims otherwise. Parents who want the strict version leave the gate on{' '}
            <em>only me</em>, which is the default.
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <div className="frame">
            <div className="frame-bar">
              <span className="dot" />
              <span className="frame-label">Parent dashboard → Approvals</span>
            </div>
            <div className="frame-body">
              <DemoApprovals />
            </div>
          </div>
          <p className="caption">
            <strong>What the parent sees.</strong> The child's note, the agent's reading of it, and
            the one activity flag — all as context, none of it deciding anything on its own.
          </p>
        </div>
      </section>

      <section className="block wide" id="screentime">
        <h2 className="section-heading">Screen time, if you want it</h2>
        <p className="section-lede">
          Off by default. Turned on, the extension records seconds per domain per day on the child's
          browser — not URLs, not page titles, not page content, not the order things were visited.
        </p>
        <div className="frame">
          <div className="frame-bar">
            <span className="dot" />
            <span className="frame-label">Parent dashboard → Screen time</span>
          </div>
          <div className="frame-body">
            <DemoScreenTime />
          </div>
        </div>
        <p className="caption">
          Measured on the child's own browser, so it is only ever as complete as that browser —
          another device, another profile, or the extension removed all mean time that simply isn't
          recorded. The dashboard says so too.
        </p>
      </section>

      <section className="block">
        <h2 className="section-heading">How it works</h2>
        <div className="steps">
          <article className="card step">
            <div>
              <h3>A parent sets chores and picks the sites</h3>
              <p>
                Chores repeat — daily, school days, or chosen days — and can rotate between
                siblings. Each carries a point value. The blocked list is per household: adding{' '}
                <code>youtube.com</code> covers its subdomains too.
              </p>
            </div>
          </article>
          <article className="card step">
            <div>
              <h3>Anything outstanding closes the gate</h3>
              <p>
                A service worker computes <code>any_pending</code> and pushes{' '}
                <code>declarativeNetRequest</code> rules that redirect those domains. Rules are
                recomputed on startup, so a restart never leaves the gate open.
              </p>
            </div>
          </article>
          <article className="card step">
            <div>
              <h3>The child marks work done</h3>
              <p>
                For chores that ask for it, they describe what they did and the verifier agent reads
                it. A pass can reopen the sites; it never pays a point.
              </p>
            </div>
          </article>
          <article className="card step">
            <div>
              <h3>A parent approves — and the sites come back</h3>
              <p>
                Approval credits points, advances the streak and awards badges, all server-side. The
                last approval removes the rules.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="block" id="privacy">
        <h2 className="section-heading">Two signals, both narrow. One is off by default.</h2>
        <p className="section-lede">
          Parental tools have a habit of quietly becoming surveillance. Here is the complete list of
          what this one records, in the same words the README uses.
        </p>

        <div className="card privacy-panel">
          <div className="privacy-head">
            <h3>1 · One boolean per task — always on</h3>
            <p>
              When the child taps "mark done", the extension asks one question:{' '}
              <em>
                was the tab that's active right now — or the last tab focused in the previous 5
                minutes — on a domain this household has blocked?
              </em>{' '}
              The yes/no answer is written to that one task, and shown to the parent as a neutral
              heads-up. It never auto-rejects, never docks points, and is never shown to the child.
            </p>
          </div>
          <div className="privacy-head">
            <h3>2 · Seconds per domain per day — only if a parent turns it on</h3>
            <p>
              The screen time dashboard records how long a tab from each domain was focused, bucketed
              by day: a flat <code>{'{ "youtube.com": 1260 }'}</code> map. It cannot be
              reconstructed into a browsing history, because the order and the timestamps are never
              stored. Idle and locked time is not counted. Off until a parent switches it on, and
              switching it off deletes what the device is holding.
            </p>
          </div>
          <div className="privacy-cols">
            <div className="privacy-col collected">
              <h4>What is stored</h4>
              <ul>
                <li>
                  <span>●</span>
                  <div>
                    One boolean per task: <code>flaggedRecentBlockedActivity</code>
                  </div>
                </li>
                <li>
                  <span>●</span>
                  <div>The child's own written note on a chore, when one is asked for</div>
                </li>
                <li>
                  <span>●</span>
                  <div>The agent's verdict on that note — one state and one sentence</div>
                </li>
                <li>
                  <span>●</span>
                  <div>
                    <strong>If screen time is on:</strong> total seconds per domain, per day
                  </div>
                </li>
              </ul>
            </div>
            <div className="privacy-col not-collected">
              <h4>What is never stored</h4>
              <ul>
                <li><span>✕</span><div>No URLs — only bare domains, and only when screen time is on</div></li>
                <li><span>✕</span><div>No page titles, page content, screenshots or form data</div></li>
                <li><span>✕</span><div>No keystrokes, messages or anything typed outside this extension</div></li>
                <li><span>✕</span><div>No visit order, no per-visit timestamps, no session log</div></li>
                <li><span>✕</span><div>No location, no camera, no microphone, no other apps</div></li>
                <li><span>✕</span><div>Nothing at all when screen time is off, beyond the one boolean</div></li>
                <li><span>✕</span><div>No analytics, telemetry or third-party trackers, ever</div></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card honest" style={{ marginTop: 16 }}>
          <span aria-hidden="true">💬</span>
          <div>
            <strong>Tell your child it's on.</strong> The dashboard says this where you switch it on,
            and it is the one piece of advice worth repeating: monitoring a child knows about is a
            house rule. Monitoring they find out about later is something else, and it costs more
            than it buys.
          </div>
        </div>

        <p className="caption" style={{ marginTop: 16 }}>
          Data lives in <strong>your own Firebase project</strong>. There is no HW Guardian server,
          no account with us, and nothing shared between households.
        </p>
      </section>

      <section className="block">
        <h2 className="section-heading">The child's app can't cheat</h2>
        <p className="section-lede">
          The child's browser runs an anonymous Firebase identity linked to one child record.
          Firestore rules let it do exactly two things.
        </p>
        <div className="grid two">
          <article className="card tile">
            <span className="ico" aria-hidden="true">✓</span>
            <h3>What it can do</h3>
            <p>
              Read its household, tasks, siblings' scoreboard rows, badges and the shop. Flip one of
              its own tasks from <code>pending</code> to <code>pending_approval</code>. Request a
              reward at the shop's live price.
            </p>
          </article>
          <article className="card tile">
            <span className="ico" aria-hidden="true">✕</span>
            <h3>What it cannot do — even from devtools</h3>
            <p>
              Set a task to <code>approved</code>. Write points, streaks or badges. Change a task's
              point value. Grant its own redemption. Touch another household. Enumerate pairing
              codes.
            </p>
          </article>
        </div>
        <p className="caption" style={{ marginTop: 14 }}>
          Points, streaks, badge awards and deductions are computed only in Cloud Functions, which
          are idempotent so a retried event can't pay out twice. There is deliberately no
          client-side fallback: a fallback that can write points is one a child can call.
        </p>
      </section>

      <section className="block">
        <h2 className="section-heading">Gamification</h2>
        <div className="grid three">
          <article className="card tile">
            <span className="ico" aria-hidden="true">⭐</span>
            <h3>Points on approval only</h3>
            <p>Parents set a value per task. Self-reporting pays nothing.</p>
          </article>
          <article className="card tile">
            <span className="ico" aria-hidden="true">🔥</span>
            <h3>Streaks in your timezone</h3>
            <p>
              Day boundaries use the household's IANA timezone, not UTC, so a late-evening task
              still counts for the right day.
            </p>
          </article>
          <article className="card tile">
            <span className="ico" aria-hidden="true">🎖️</span>
            <h3>Eight badges</h3>
            <p>
              First task, 3/7/30-day streaks, 10 and 50 tasks, early bird before 9am, and a comeback
              for restarting after a break.
            </p>
          </article>
          <article className="card tile">
            <span className="ico" aria-hidden="true">🎁</span>
            <h3>Reward shop</h3>
            <p>
              Points are deducted server-side when a child requests; the parent grants it in real
              life. Declining refunds automatically.
            </p>
          </article>
          <article className="card tile">
            <span className="ico" aria-hidden="true">🏅</span>
            <h3>Household-only scoreboard</h3>
            <p>
              Siblings ranked by points or streak, with no red "losing" language for last place. It
              never reaches outside the household.
            </p>
          </article>
          <article className="card tile">
            <span className="ico" aria-hidden="true">✨</span>
            <h3>Gemini, optional</h3>
            <p>
              Task suggestions for parents and a daily encouraging line, proxied through a Cloud
              Function so the API key never ships in the bundle.
            </p>
          </article>
        </div>
      </section>

      <section className="block" id="install">
        <h2 className="section-heading">Run it locally</h2>
        <p className="section-lede">
          You'll need a Firebase project with Email/Password <em>and</em> Anonymous sign-in enabled.
          Full setup, including rules and functions, is in the README.
        </p>
        <pre>
          <code>{`git clone ${REPO}.git
cd hwguradian
cp .env.example .env.local     # paste your Firebase web config
npm install
npm run build`}</code>
        </pre>
        <p className="caption">
          Then <code>chrome://extensions</code> → enable <strong>Developer mode</strong> →{' '}
          <strong>Load unpacked</strong> → pick the <code>dist/</code> folder. The options page
          opens on first install so you can set a parent PIN.
        </p>
      </section>

      <section className="block">
        <h2 className="section-heading">Known limitations</h2>
        <div className="limits">
          <div className="limit">
            <span>—</span>
            <div>
              <strong>A determined child can remove the extension.</strong> No ordinary unpacked
              extension can stop that. Real enforcement needs a managed profile via Chrome
              Enterprise policy or Family Link, which is out of scope for v1. Treat this as a
              friction-and-motivation tool built on trust, not a lock.
            </div>
          </div>
          <div className="limit">
            <span>—</span>
            <div>
              <strong>Cloud Functions need the Blaze plan.</strong> Without them, everything works
              except point, streak and badge crediting.
            </div>
          </div>
          <div className="limit">
            <span>—</span>
            <div>
              <strong>Main-frame navigations only.</strong> Embedded iframes aren't redirected, and
              incognito is off unless you enable it for the extension.
            </div>
          </div>
          <div className="limit">
            <span>—</span>
            <div>
              <strong>Host permissions are asked per domain</strong>, as the parent adds each one,
              rather than <code>&lt;all_urls&gt;</code> up front. Expect a Chrome prompt there.
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div>
          HW Guardian / TaskGate · <a href={REPO}>source on GitHub</a>
        </div>
        <div style={{ marginTop: 6 }}>
          This page runs the extension's own components. Data on it is mock data and goes nowhere.
        </div>
      </footer>
    </div>
  );
}
