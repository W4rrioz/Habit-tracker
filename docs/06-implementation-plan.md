# Implementation Plan

## 1. Current Project State
- Existing code: None — greenfield project.
- Reusable parts: N/A.
- Missing foundations: Everything.
- Risks: This is now a substantially bigger project than the original single-user idea — auth, multi-user data, recurring-task date logic, and charts are all real complexity. The plan below is ordered so the hardest/most foundational pieces (auth, data model) are solid before layering features on top.

## 2. Build Principles
- Get auth and the core data model right first — every other feature depends on "which user is this, and is their data private."
- Build one feature fully (including its UI) before starting the next, rather than half-building several at once.
- Test the two trickiest logic areas — streaks and leftover-period boundaries — against hand-constructed scenarios before trusting them.
- Follow the UI/UX Brief and `08-ui-page-prompts.md` consistently so the app feels like one product, not eight bolted-together pages.

## 3. Ordered Phases

### Phase 0 — Project Foundation & Database
- Goal: Running skeleton with the full database schema in place.
- Components: Supabase project set up; all tables from `05-backend-schema.md` created; Express server scaffolded; React app scaffolded (Vite) with routing for every page in `03-app-flow.md`.
- Tests/verification: Backend connects to Supabase successfully; frontend loads a placeholder for each route.
- Completion criteria: You can run frontend + backend locally, and every route (even if empty) loads without error.

### Phase 1 — Authentication
- Goal: Working signup/login/logout with real sessions.
- Components: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; bcrypt password hashing; session cookie handling; Login and Create Account pages (per `08-ui-page-prompts.md` #1 and #1b).
- Tests/verification: Create an account, log out, log back in; confirm a wrong password is rejected; confirm session persists across a refresh; confirm two accounts can't share a username.
- Completion criteria: Full signup -> logout -> login loop works correctly and securely (passwords never visible in plain text anywhere, including logs).

### Phase 2 — Habits (core loop)
- Goal: Full habit tracking working for a logged-in user.
- Components: Habit CRUD endpoints, check-in endpoint, streak calculation, My Habits / Add-Edit Habit / Habit Detail pages (without charts yet — charts come in Phase 6).
- Tests/verification: Add a habit, check it in over several days (real or backdated test data), confirm streak numbers are correct against a manual calendar check for at least 3 scenarios.
- Completion criteria: Habit tracking works end-to-end and streaks are verifiably accurate.

### Phase 3 — Todos & Leftover Tracking
- Goal: Full todo management, including recurring todos and leftover detection.
- Components: Todo CRUD endpoints, `todo_completions` handling, `GetLeftovers` logic (pin down week-start convention first, per Backend Schema's open question), Todos / Add-Edit Todo pages.
- Tests/verification: Create a one-time todo and complete it; create a daily recurring todo, don't complete it, advance the system date (or simulate) and confirm it shows as leftover; repeat for weekly and monthly boundaries.
- Completion criteria: Leftover detection is verifiably correct for daily, weekly, and monthly recurrence at their period boundaries.

### Phase 4 — Daily Dashboard
- Goal: Combine habits, todos, and leftovers into the single home view.
- Components: Dashboard page pulling from the endpoints built in Phases 2-3; quick-add flow.
- Tests/verification: Checking off a habit or todo from the Dashboard behaves identically to doing so from its own page.
- Completion criteria: Dashboard is the natural daily-use entry point and stays in sync with the dedicated Habits/Todos pages.

### Phase 5 — Focus Timer & Journal
- Goal: Add the two simpler standalone features.
- Components: Timer page + `POST /timer/session` + session counting; Journal page + `GET/POST /journal/:date`.
- Tests/verification: A completed timer session is logged; a manually reset timer is not; journal entries save and reload correctly per date.
- Completion criteria: Both features work independently and are reachable from the nav bar and (for today's timer count) the Dashboard.

### Phase 6 — Charts & Stats
- Goal: Add pie/line/bar charts to Habit Detail (and anywhere else stats are shown).
- Components: `GET /habits/:id/stats` endpoint, Chart.js integration styled per the UI/UX Brief.
- Tests/verification: Chart values match manual calculation from stored data for a test habit; charts handle the "not enough data yet" case gracefully.
- Completion criteria: Habit Detail shows accurate, correctly-styled charts.

### Phase 7 — Leaderboard
- Goal: Cross-user streak comparison.
- Components: `GET /leaderboard` aggregate query, Leaderboard page.
- Tests/verification: Create a second test account, verify both users' streaks appear correctly ranked, and the logged-in user's row is highlighted.
- Completion criteria: Leaderboard is accurate and correctly scoped (only streak values exposed, not private habit/todo details).

### Phase 8 — Admin Panel
- Goal: Admin-only visibility into all users.
- Components: `is_admin` check (server-side, not just UI-hidden), `GET /admin/users`, Admin Panel page.
- Tests/verification: Confirm a non-admin account is blocked from both the UI route and a direct API call; confirm an admin account sees all users correctly.
- Completion criteria: Access control is verifiably correct, not just visually hidden.

### Phase 9 — Polish
- Goal: Make the whole app cohesive and pleasant, per the UI/UX Brief and page prompts.
- Components: Visual consistency pass across all pages, mobile responsiveness check, loading/empty/error states everywhere, milestone-streak celebration touches (optional).
- Tests/verification: Use the app for real, daily, for at least a week across every feature.
- Completion criteria: You'd genuinely want to keep using it, and a friend could sign up and use it without confusion.

## 4. Suggested Sequence
1. Project foundation & database
2. Authentication
3. Habits (core loop)
4. Todos & leftover tracking
5. Daily dashboard
6. Focus timer & journal
7. Charts & stats
8. Leaderboard
9. Admin panel
10. Polish

## 5. Requirement Traceability

| PRD Feature | Phase | Verification |
|---|---|---|
| Authentication | Phase 1 | Signup/login/logout loop, wrong-password rejection |
| Habits | Phase 2 | Manual streak cross-check on 3+ scenarios |
| Todo List | Phase 3 | CRUD + view sorting correctness |
| Leftover Tracking | Phase 3 | Daily/weekly/monthly boundary tests |
| Daily Dashboard | Phase 4 | Cross-consistency with dedicated pages |
| Focus Timer | Phase 5 | Session logged only on natural completion |
| Daily Journal | Phase 5 | Save/reload per date |
| Charts & Visualization | Phase 6 | Values match manual calculation |
| Leaderboard | Phase 7 | Correct ranking, correct data exposure |
| Admin Panel | Phase 8 | Server-side access control verified |

## 6. Final Verification
- Functional checks: Every feature in the PRD works end-to-end as a real logged-in user.
- Security checks: A user cannot access another user's private data via a crafted API request; non-admins cannot reach admin data.
- Reliability checks: Data survives a backend restart and a browser refresh (Supabase persistence confirmed).
- Usability checks: A friend can sign up and use the app without you explaining anything.
