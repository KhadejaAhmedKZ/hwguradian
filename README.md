# HW Guardian (TaskGate)

A Chrome extension (Manifest V3) that keeps distracting sites closed until a
child's parent-assigned tasks are done **and approved**, wrapped in a points,
streak and badge system that makes finishing them feel worth it.

Two surfaces, one extension:

| Surface | Who | What it does |
| --- | --- | --- |
| **Popup** (toolbar icon) | the child | Task list, points, streak, badge case, reward shop, household scoreboard. No PIN. |
| **Options page** | the parent | PIN-protected dashboard: tasks, approvals, rewards, bonus points, blocked sites. |

---

## How the gate actually works

1. The parent creates tasks and lists the domains to block.
2. The background service worker computes `any_pending` — true if **any** task
   for this child is `pending` or `pending_approval`.
3. While true, `chrome.declarativeNetRequest` dynamic rules redirect every
   blocked domain (and its subdomains) to a local encouragement page listing the
   outstanding tasks and what they're worth.
4. The parent approves. Points, streak and badges are applied **server-side**.
   The last approval removes the rules and the sites come back.

Rules are recomputed and reapplied on `onInstalled` and `onStartup` from cached
state, so a restarted service worker never leaves the gate open by accident.
Realtime Firestore listeners drive updates, with a 60-second alarm as a fallback
for when the worker has been asleep.

---

## Stack

- **Firebase** — Firestore (data + realtime), Auth (parent email/password and
  child anonymous), Cloud Functions (points/streaks/badges/rewards, Gemini proxy)
- **React + TypeScript + Vite** — popup, options page and blocked page
- **Manifest V3** — `declarativeNetRequest` for blocking (not the deprecated
  blocking `webRequest` API)

```
shared/        award logic, badge catalog, types — one copy, used by both sides
src/
  background/  MV3 service worker: sync, DNR rules, the active-tab check
  popup/       child view (React)
  options/     parent dashboard (React)
  blocked/     the "almost there" page
  lib/         Firestore paths, actions, PIN hashing, blocking, Gemini client
functions/     Cloud Functions (Firestore triggers + callable Gemini proxy)
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
on approval, and point deduction on reward requests. That logic is deliberately
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

This section is the point of the product, so it is specific.

### What is collected

**One boolean per task.** When the child taps "mark done", the extension asks
the background worker a single yes/no question: *was the tab that is active
right now — or the last tab focused in the previous 5 minutes — on one of the
domains this household has blocked?* The answer is written to that one task as
`flaggedRecentBlockedActivity`.

That is the entire activity signal. There is nothing else.

### What is **not** collected

- ❌ No browsing history, in any form, anywhere.
- ❌ No URLs. Not stored, not sent, not logged — not even the blocked ones.
- ❌ No domain names of any kind, including the blocked domain that triggered
  the flag. The extension knows *that* a blocked site was recently focused; it
  does not record *which*.
- ❌ No time tracking, no session lengths, no visit counts.
- ❌ No keystrokes, page content, screenshots or form data.
- ❌ Nothing at all about sites that are not on the household's blocked list.
- ❌ No analytics, telemetry or third-party trackers.

The intermediate "a blocked tab was focused" timestamp lives in
`chrome.storage.session`, which Chrome clears when the browser closes. It holds
a number and nothing else, and it is read exactly once — at mark-done time.

### How the flag is used

It appears in the parent's approval queue as a neutral line:

> 👀 **Heads-up:** was on a blocked site just before marking this done.

And that is all it ever does. By design it **never**:

- auto-rejects or blocks the task,
- deducts or reduces points,
- appears anywhere in the child's popup,
- gets aggregated, counted, or shown as a history or a score.

It is one piece of context for a parent who knows their kid. There are ordinary
reasons a blocked site was open — a sibling, a link from a teacher, a tab left
from yesterday. The flag is a conversation starter, not a verdict.

### Where data lives

In **your own Firebase project**. There is no HW Guardian server, no account
with us, and no data shared between households. The Firestore rules restrict
every document to the household that owns it; the leaderboard can only ever read
siblings inside that same household.

---

## Security model

The child's browser runs an **anonymous Firebase identity** linked to exactly
one child record. The Firestore rules (`firestore.rules`) let that identity:

- read its household, its own tasks, siblings' scoreboard rows, badges, the
  reward shop and its own redemptions;
- flip one of its own tasks from `pending` → `pending_approval`, setting the
  activity boolean on the same write;
- create a redemption with status `requested`, at the shop's live price.

It **cannot**, even with a hand-crafted request from a devtools console:

- set any task to `approved`;
- write `totalPoints`, `currentStreak`, `longestStreak`, `tasksApproved` or any
  badge document;
- change a task's point value or reassign it to another child;
- grant its own redemption;
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
two sides cannot drift.

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
| `tabs` | Reading the active tab's URL for the one check described in Privacy. Nothing is stored. |
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
| `npm run icons` | Regenerate the PNG icons |
| `npm run deploy:rules` | Deploy Firestore rules + indexes |
| `npm run deploy:functions` | Deploy Cloud Functions |
| `npm run emulators` | Local Firebase emulators |
