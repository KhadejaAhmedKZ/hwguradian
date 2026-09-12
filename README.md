# HW Guardian (TaskGate)

A Chrome extension (Manifest V3) that keeps distracting sites closed until a
child's chores are done — and a verifier agent or a parent says so. Points,
streaks, badges and a reward shop make finishing feel worth it; an opt-in screen
time dashboard shows the parent where the day went.

**[Live demo →](https://khadejaahmedkz.github.io/hwguradian/)** — the extension's own
React components running in a web page with mock data.

Two surfaces, one extension:

| Surface | Who | What it does |
| --- | --- | --- |
| **Popup** (toolbar icon) | the child | Task list, written notes for the verifier agent, points, streak, badge case, reward shop, household scoreboard. No PIN. |
| **Options page** | the parent | PIN-protected dashboard: chores, approvals, screen time, one-off tasks, rewards, bonus points, blocked sites, agent settings. |

---

## How the gate actually works

1. The parent sets up **chores** — what, who, how much it's worth, and which days
   it repeats (daily, school days, or days they pick; with two or more children a
   chore can rotate between them). They also list the domains to block.
2. On each due day `syncChores` turns the chore into a real **task**. The task id
   is derived from chore + day, so it cannot be created twice.
3. The background service worker computes whether the gate is closed — true while
   **any** task for this child is still outstanding, per the household's gate
   policy (below).
4. While closed, `chrome.declarativeNetRequest` dynamic rules redirect every
   blocked domain (and its subdomains) to a local encouragement page listing the
   outstanding tasks and what they're worth.
5. The child marks work done. For chores that ask for it, they write a sentence
   about what they did and the **verifier agent** reads it.
6. The parent approves. Points, streak and badges are applied **server-side**.
   The last outstanding task clearing removes the rules and the sites come back.

### Gate policy

Set in **Settings → What reopens the blocked sites**:

| Policy | What reopens the sites | Who awards points |
| --- | --- | --- |
| `parent_only` *(default)* | Only a parent approving the task | The parent |
| `agent_unlock` | A `pass` verdict from the verifier agent, immediately | Still the parent |

Under `agent_unlock` the task stays in the approval queue and **no points move**
until the parent approves it. The agent can reopen a website. It cannot pay.

Rules are recomputed and reapplied on `onInstalled` and `onStartup` from cached
state, so a restarted service worker never leaves the gate open by accident.
Realtime Firestore listeners drive updates, with a 60-second alarm as a fallback
for when the worker has been asleep.

---

## The agent layer

Three agents, all defined in `functions/src/agents/registry.ts` and all running
**server-side**. That is not an optimisation — an agent's answer is only worth
something if the device it judges cannot author it. The verifier writes to a task
field that Firestore rules make unwritable by every client, parent included.

| Agent | Called by | What it does |
| --- | --- | --- |
| `chore_verifier` | the child | Reads their written note against the chore definition. Can reopen blocked sites; can never award points. |
| `chore_planner` | the parent | Suggests age-appropriate chores to review and edit. |
| `coach` | anyone | Writes the one encouraging line on the blocked page. Sees no data about the child. |

No agent can approve a task, move a point, change a streak or award a badge.
Those are parent-only, enforced in `firestore.rules` rather than by asking a
prompt nicely.

### What the verifier can and cannot tell you

It reads what the child **wrote**. It cannot see the room, the worksheet or the
bin. A convincing description of a chore that never happened will pass.

What it does buy you is real but modest: it raises the cost of fobbing a parent
off from two words to a paragraph, it asks one specific follow-up question when
an answer is vague, and it lets a child who genuinely did the work get their
sites back without waiting for a parent to get home. It is a filter on effort,
not a truth detector, and nothing in the product claims otherwise. Parents who
want the strict version leave the gate on `parent_only`, which is the default.

Verification is rate-limited to 5 attempts per task; after that it goes to the
parent regardless. If the model is unavailable the verdict is `unclear` and the
child is never blocked by an outage.

## Stack

- **Firebase** — Firestore (data + realtime), Auth (parent email/password and
  child anonymous), Cloud Functions (points/streaks/badges/rewards, chore
  materialisation, the agent layer)
- **React + TypeScript + Vite** — popup, options page and blocked page
- **Manifest V3** — `declarativeNetRequest` for blocking (not the deprecated
  blocking `webRequest` API)

```
shared/        award logic, badge catalog, types — one copy, used by both sides
site/          the GitHub Pages demo — imports the real popup components
src/
  background/  MV3 service worker: sync, DNR rules, the active-tab check
  popup/       child view (React)
  options/     parent dashboard (React)
  blocked/     the "almost there" page
  lib/         Firestore paths, actions, PIN hashing, blocking, usage accounting
functions/     Cloud Functions (Firestore triggers, chore sync, the agent layer)
firestore.rules
```

---

## Setup

### 1. Create the Firebase project

1. https://console.firebase.google.com → **Add project**.
2. **Build → Authentication → Get started**, then enable **Email/Password**
   *and* **Anonymous** sign-in providers. Both are required.
3. **Build → Firestore Database → Create database** (production mode is fine —
   the rules in this repo replace the defaults).
4. **Project settings → Your apps → Web (`</>`)** → register an app → copy the
   `firebaseConfig` values.

### 2. Configure locally

```bash
cp .env.example .env.local
```

Paste the config values into `.env.local`. It is gitignored. The Firebase web
API key is a public project identifier, not a credential — access is controlled
entirely by the Firestore rules below.

### 3. Deploy rules, indexes and functions

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # pick your project
firebase deploy --only firestore:rules,firestore:indexes
```

Cloud Functions need the **Blaze** plan (Firestore triggers are not available on
Spark). Set the Gemini key as a secret so it never ships inside the extension,
then deploy:

```bash
firebase functions:secrets:set GEMINI_API_KEY
cd functions && npm install && cd ..
firebase deploy --only functions
```

Without the functions deployed, everything works except: points/streaks/badges
on approval, point deduction on reward requests, chore→task materialisation, and
every agent. That logic is deliberately
server-only — see [Why the logic is server-side](#why-the-logic-is-server-side).

### 4. Build and load the extension

```bash
npm install
npm run build
```

Then in Chrome:

1. Go to `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → select the `dist/` folder
4. The options page opens automatically on first install

`npm run dev` rebuilds on change; hit the reload arrow on the extension card in
`chrome://extensions` to pick up changes.

### 5. First run

**On the parent's browser** (options page):
1. Set a 4–6 digit parent PIN.
2. Create or sign into a parent Firebase account.
3. Name your household.
4. **Children** → add a child → **Pairing code**.
5. **Blocked sites** → add domains. Chrome will ask for permission to redirect
   each one; that prompt is expected (see [Permissions](#permissions)).
6. **Tasks** → assign a few.

**On the child's browser**: install the extension, open the popup, type the
pairing code. Codes are single-use and expire after 24 hours.

> Parent and child can share one browser profile — the two Firebase sessions are
> kept separate — but a separate Chrome profile for the child is cleaner.

### Local development with emulators

```bash
firebase emulators:start
# set VITE_USE_EMULATORS=true in .env.local, then npm run build
```

`functions/.secret.local` supplies `GEMINI_API_KEY` to the emulator.

---

## Privacy

This section is the point of the product, so it is specific. There are exactly
two things recorded, and one of them is off until you turn it on.

### 1. One boolean per task — always on

When the child taps "mark done", the extension asks the background worker a
single yes/no question: *was the tab that is active right now — or the last tab
focused in the previous 5 minutes — on one of the domains this household has
blocked?* The answer is written to that one task as
`flaggedRecentBlockedActivity`.

It appears in the parent's approval queue as a neutral line:

> 👀 **Heads-up:** was on a blocked site just before marking this done.

And that is all it ever does. By design it **never** auto-rejects the task,
deducts points, appears in the child's popup, or gets aggregated into a history
or a score. The intermediate "a blocked tab was focused" timestamp lives in
`chrome.storage.session`, which Chrome clears when the browser closes.

Note what is *not* in that record: not the URL, not the domain. The extension
knows *that* a blocked site was recently focused; it does not store *which*.

### 2. Screen time — off by default, opt-in per household

Turned on, the extension records **how many seconds a tab from each domain was
focused, bucketed by day**. The stored shape is literally this:

```json
{ "day": "2026-09-12", "domains": { "youtube.com": 3000, "wikipedia.org": 780 },
  "totalSeconds": 3780 }
```

That cannot be reconstructed into a browsing history, because the order and the
per-visit timestamps are never written down. Idle and locked time is not counted
(`chrome.idle`, 60s threshold), and a single focus segment is capped at 30
minutes so a closed laptop doesn't bank hours. Switching it off deletes what the
device is holding.

### What is never collected, either way

- ❌ No URLs. Only bare domains, and only while screen time is on.
- ❌ No page titles, page content, screenshots or form data.
- ❌ No keystrokes, and nothing typed outside this extension.
- ❌ No visit order, no per-visit timestamps, no session log.
- ❌ No location, camera, microphone, or anything about other applications.
- ❌ Nothing at all about any site while screen time is off, beyond the one
  boolean above.
- ❌ No analytics, telemetry or third-party trackers, ever.

### The advice that matters more than the settings

**Tell your child the screen time dashboard is on.** The extension says this
where you switch it on, and it is worth repeating here: monitoring a child knows
about is a house rule, and it can be discussed, negotiated and outgrown.
Monitoring they discover later is a different thing, and it tends to cost more
trust than the data is worth.

### Where data lives

In **your own Firebase project**. There is no HW Guardian server, no account with
us, and no data shared between households. The Firestore rules restrict every
document to the household that owns it; the leaderboard can only ever read
siblings inside that same household.

## Security model

The child's browser runs an **anonymous Firebase identity** linked to exactly
one child record. The Firestore rules (`firestore.rules`) let that identity:

- read its household, its own tasks, siblings' scoreboard rows, badges, the
  reward shop and its own redemptions;
- flip one of its own tasks from `pending` → `pending_approval`, setting the
  activity boolean on the same write;
- create a redemption with status `requested`, at the shop's live price;
- write its own screen-time totals, when the household has opted in.

It **cannot**, even with a hand-crafted request from a devtools console:

- set any task to `approved`;
- write `totalPoints`, `currentStreak`, `longestStreak`, `tasksApproved` or any
  badge document;
- change a task's point value or reassign it to another child;
- grant its own redemption;
- write an agent verdict, or the evidence text the verdict was based on — both
  are server-authored and locked away from *every* client, the parent included;
- create or edit a chore;
- read or write anything in another household;
- enumerate pairing codes (`list` is denied — you must know the exact code).

### Why the logic is server-side

Points, streaks, badge awards and reward deductions are computed only in
`functions/src/index.ts`, which uses the Admin SDK. The clients write *intent*
(`status: 'approved'`, `status: 'requested'`); the server derives every number.
The approval trigger is idempotent via a `pointsCredited` marker, so a retried
event delivery cannot pay out twice.

`shared/awards.ts` is the one copy of the streak and badge rules;
`functions/scripts/sync-shared.mjs` mirrors it into the functions build so the
two sides cannot drift. `npm run test:awards` exercises that compiled copy —
the exact code that runs on the server — across same-day repeats, missed days,
comebacks, timezone-sensitive day boundaries and the early-bird cutoff.

### The PIN

The parent PIN is hashed with PBKDF2-SHA256 (250k iterations, random salt) and
stored in `chrome.storage.local`. The plaintext PIN is never stored.

The PIN is a **speed bump**, not a security boundary — it stops a curious child
poking at the dashboard on a shared profile. The real boundary is the parent's
Firebase account password plus the rules above. Anyone who can run code as the
browser user can clear extension storage and reset the PIN; they still cannot
approve a task, because approval requires the parent's Firebase credentials.

---

## Permissions

| Permission | Why |
| --- | --- |
| `declarativeNetRequest` (+ `WithHostAccess`) | The blocking itself. |
| `storage` | Cached tasks, the hashed PIN, leaderboard ranks. |
| `alarms` | The 60-second sync fallback. |
| `tabs` | Reading the active tab's domain — for the one check described in Privacy, and for screen time when it is on. |
| `idle` | Stopping the screen time clock when the machine is idle or locked. |
| `host_permissions` | Firestore, Firebase Auth and Cloud Functions endpoints only. |
| `optional_host_permissions` | Requested **per blocked domain**, when the parent adds it — not up front for every site. |

Chrome requires host access to redirect a request. Rather than asking for
`<all_urls>` at install, HW Guardian asks only for the domains the parent
actually blocks, at the moment they add them.

---

## Known limitations

- **A determined child can remove the extension.** `chrome://extensions` →
  Remove, or just switch to another browser or profile. There is no way for an
  ordinary unpacked extension to prevent this. Real enforcement needs a managed
  browser profile — **Chrome Enterprise policy** (`ExtensionInstallForcelist`,
  `ExtensionSettings`) or **Google Family Link** — which is out of scope for
  v1. Treat HW Guardian as a friction-and-motivation tool built on trust, not a
  lock.
- **Screen time is self-reported by the child's browser.** The measurement only
  exists on that device, so the device writes it. A child who wanted to could
  suppress or forge it — as they could by using another browser, another profile,
  or another device entirely. It is a picture of a day, not an audit trail, and
  the dashboard says so.
- **The verifier agent reads words, not rooms.** See
  [What the verifier can and cannot tell you](#what-the-verifier-can-and-cannot-tell-you).
- Incognito is off unless explicitly enabled for the extension in
  `chrome://extensions`.
- Only main-frame navigations are redirected — embedded iframes are not.
- Chrome caps dynamic DNR rules; the code caps the blocked list at 500 domains.
- Cloud Functions require the Blaze plan.
- The 5-minute activity window uses `chrome.storage.session`, so a browser
  restart clears it — by design.

---

## Scripts

| Command | What |
| --- | --- |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run dev` | Rebuild on change |
| `npm run typecheck` | Types only |
| `npm run test:awards` | Build functions, then check the streak/badge rules |
| `npm run build:site` | Build the Pages demo site to `dist-site/` |
| `npm run icons` | Regenerate the PNG icons |
| `npm run deploy:rules` | Deploy Firestore rules + indexes |
| `npm run deploy:functions` | Deploy Cloud Functions |
| `npm run emulators` | Local Firebase emulators |
