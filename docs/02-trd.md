# Technical Requirements Document

## 1. Technical Overview
- Architecture summary: A React frontend talking to a Node/Express backend API, backed by a Supabase (Postgres) database. Custom username/password authentication with session tokens (not Supabase's built-in auth, since the product requirement is plain username+password). All feature logic (streaks, leftover tracking, stats) computed on the backend; frontend focuses on display and interaction.
- Platforms: Browser (desktop + mobile web).
- Main technical constraints: Must run entirely on free-tier infrastructure; must support multiple real user accounts with private data; no external OAuth/calendar integrations (explicitly dropped from scope).

## 2. Technology Stack
- Frontend: React (Vite) — reason: component model suits many distinct pages/widgets (dashboard, habits, todos, timer, journal, leaderboard, admin) cleanly; large ecosystem for charts and forms. Rejected alternative: plain HTML/JS — would work, but React's reusable components make a multi-page app like this much easier to keep consistent.
- Backend: Node.js + Express — reason: one language (JavaScript) across the whole stack; simple REST API is sufficient for this app's needs. Rejected alternative: Python/Flask — no real advantage here and splits the stack across two languages.
- Database: Supabase (hosted Postgres, free tier) — reason: real production-grade SQL database, free tier is generous, and Supabase's table editor UI is genuinely useful for learning/debugging (you can see your data directly). Rejected alternative: Firebase/Firestore — a NoSQL document model fits this relational data (users → habits → checkins) less naturally than Postgres.
- Authentication: Custom-built (not Supabase Auth) — reason: the product requirement is specifically username+password, and Supabase's built-in auth is email-centric; rolling a simple bcrypt-hashed password + session-token system is well within scope and a genuinely valuable thing to understand end to end. Passwords hashed with bcrypt; sessions via signed tokens stored in an HTTP-only cookie.
- Charting library: Chart.js (via `react-chartjs-2`) — reason: simple API, supports pie/line/bar out of the box, matches the UI/UX Brief's rounded/soft visual direction well with minor styling.
- Hosting: Local development for the build phase; optionally deploy later to free tiers (e.g. Vercel for frontend, Render/Railway for backend) once working — not required for early phases.
- Testing: Manual testing throughout; targeted automated tests for the two trickiest logic areas — streak calculation and leftover-period boundaries — since those are the most bug-prone.

## 3. System Architecture
- Client (React) responsibilities: Render all pages per the UI/UX Brief and page prompts; handle login/session state; call the backend API for all data; render charts from data the backend already computed.
- Server (Express) responsibilities: Authentication (signup/login/session validation, password hashing); all CRUD for habits/todos/journal entries; streak calculation; leftover-period detection (based on server's system date); leaderboard ranking; admin-only user listing (with access control).
- Database (Supabase/Postgres) responsibilities: Durable storage for users, habits, checkins, todos, journal entries, and focus-timer session logs.

## 4. APIs and Integrations

### Internal REST API (frontend <-> backend)
- Purpose: All app functionality.
- Auth endpoints: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` (current session check).
- Habit endpoints: `GET/POST /habits`, `PUT/DELETE /habits/:id`, `POST /habits/:id/checkin`, `GET /habits/:id/history`, `GET /habits/:id/stats`.
- Todo endpoints: `GET/POST /todos`, `PUT/DELETE /todos/:id`, `POST /todos/:id/complete`.
- Leftover endpoint: `GET /leftovers` (computed server-side based on current date vs. recurrence periods).
- Timer endpoint: `POST /timer/session` (log a completed session), `GET /timer/stats`.
- Journal endpoints: `GET/POST /journal/:date`.
- Leaderboard endpoint: `GET /leaderboard?metric=current|longest`.
- Admin endpoint: `GET /admin/users` (restricted to `is_admin = true`, enforced server-side, not just hidden in the UI).
- Data sent/received: JSON.
- Authentication: Session token required (via cookie) on every endpoint except signup/login.
- Failure handling: Clear JSON error messages surfaced by the frontend; 401 responses on invalid/expired sessions redirect the user to Login.

## 5. Security and Privacy
- Authentication and authorization: Passwords hashed with bcrypt (never stored/logged in plain text); session tokens signed and stored in HTTP-only cookies; every data-modifying endpoint checks the session belongs to the user who owns that data (a user cannot edit another user's habits/todos via a crafted request).
- Admin access: `is_admin` checked server-side on every admin route, not just hidden in the frontend UI — a non-admin user hitting the admin API directly must still be rejected.
- Input validation: Non-empty required fields (username, password, habit/task titles); reasonable length limits; dates validated as real dates.
- Secrets management: Database connection string and session-signing secret stored as environment variables, never committed to the repository.
- Sensitive data handling: Habits/todos/journal entries are private per-user; only streak values (not raw habit names, unless desired later) are exposed via the leaderboard.

## 6. Performance Requirements
- Expected usage: A handful to a few dozen users at most, low request volume — no scaling concerns at this stage.
- Loading targets: Under 1 second for typical actions (check-in, page load, timer start).
- Caching: Not needed at this scale.

## 7. Testing and Quality
- Manual testing: Full click-through of every feature per the PRD's acceptance criteria.
- Targeted automated tests: Streak-calculation logic (a few constructed date scenarios); leftover-period boundary logic (daily/weekly/monthly edge cases, e.g. what happens exactly at midnight or at a week/month boundary).
- Security spot-check: Confirm a logged-in user cannot access another user's data by manually trying an API call with someone else's habit/todo ID.

## 8. Development and Deployment
- Environments: Local development (`npm run dev` frontend, `node server.js` backend, Supabase free-tier project for the database — usable from local dev, no local DB setup needed).
- Environment variables: Supabase connection details, session-signing secret, backend port.
- Deployment: Optional later step once the app works locally — frontend to Vercel/Netlify, backend to Render/Railway, both free-tier.

## 9. Technical Risks and Open Questions
- Risk: Rolling custom auth means security mistakes are possible if rushed — mitigate by keeping the implementation simple and well-tested (hash passwords, validate sessions on every request, don't trust the frontend for authorization decisions) rather than adding extra auth features.
- Risk: Leftover-tracking date-boundary logic (especially weekly/monthly) is the trickiest piece in the whole app — worth writing it as an isolated, well-tested module rather than scattering date math across the codebase.
- Open question: Exact week-start convention (Monday vs. Sunday) for weekly recurrence — must be decided before implementing leftover tracking (see PRD open questions).
