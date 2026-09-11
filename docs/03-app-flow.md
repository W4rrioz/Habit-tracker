# App Flow

## 1. Entry Points
- First visit (no account): lands on Login page; can navigate to Create Account.
- First visit (has account, no active session): lands on Login page.
- Returning visit (active session): lands directly on the Daily Dashboard.

## 2. Authentication Flow
- Create Account: username + password + confirm password -> validated -> account created -> auto-logged-in -> redirected to Dashboard.
- Login: username + password -> validated against stored hash -> session created -> redirected to Dashboard.
- Logout: clears session -> redirected to Login.
- Session expiry / invalid session: any API call returning 401 redirects the user back to Login.

## 3. Screen Inventory

### Screen: Login
- Route: `/login`
- Purpose: Authenticate an existing user.
- Entry conditions: No active session.
- Main content: Username field, password field, Login button, link to Create Account.
- Primary action: Submit login.
- Secondary actions: Navigate to Create Account.
- Loading state: Button shows "Logging in..." while request is in flight.
- Empty state: N/A.
- Error state: Inline message for invalid username/password.
- Success state: Redirect to Dashboard.
- Next destination: Dashboard (success) or Create Account (secondary action).

### Screen: Create Account
- Route: `/signup`
- Purpose: Register a new user.
- Entry conditions: No active session.
- Main content: Username, password, confirm password fields, Create Account button, link to Login.
- Primary action: Submit signup.
- Secondary actions: Navigate to Login.
- Loading state: Button shows "Creating account..." while request is in flight.
- Empty state: N/A.
- Error state: Inline messages for taken username or mismatched passwords.
- Success state: Auto-login and redirect to Dashboard.
- Next destination: Dashboard (success) or Login (secondary action).

### Screen: Daily Dashboard
- Route: `/`
- Purpose: One combined view of today's habits, todos, and leftovers.
- Entry conditions: Active session.
- Main content: Today's habits list (with check-in toggles), today's todos list, leftovers section.
- Primary action: Check off a habit or todo directly from this screen.
- Secondary actions: Navigate to Habits, Todos, Timer, Journal, Leaderboard, or (if admin) Admin Panel via a nav bar; tap "+" to quickly add a habit or todo.
- Loading state: Skeleton placeholders while data loads.
- Empty state: New user with nothing set up shows a prompt to add a first habit/todo.
- Error state: Clear "couldn't load your data" message if the backend is unreachable.
- Success state: All sections populated and interactive.
- Next destination: Any nav item; Add Habit/Todo flow.

### Screen: My Habits
- Route: `/habits`
- Purpose: Full list of all habits, manage them.
- Entry conditions: Active session.
- Main content: List of habit cards (name, frequency, current/longest streak).
- Primary action: Tap a habit to view its detail/history.
- Secondary actions: "+ Add Habit"; Edit from within a habit's detail screen.
- Loading/empty/error/success states: Standard per list-screen conventions (skeleton, "add your first habit," error message, populated list).
- Next destination: Habit Detail, Add/Edit Habit.

### Screen: Add / Edit Habit
- Route: `/habits/new`, `/habits/:id/edit`
- Purpose: Create or modify a habit.
- Entry conditions: From My Habits or a habit's detail screen.
- Main content: Name field, target frequency selector.
- Primary action: Save.
- Secondary actions: Cancel; (edit mode) Archive habit.
- Loading state: "Saving..." on the button.
- Error state: Inline validation (empty name).
- Success state: Redirect to My Habits (or Habit Detail if editing).
- Next destination: My Habits or Habit Detail.

### Screen: Habit Detail
- Route: `/habits/:id`
- Purpose: History and stats for one habit.
- Entry conditions: From My Habits or Dashboard.
- Main content: Current/longest streak, 7-day-editable history grid, pie chart (completion breakdown), line/bar chart (trend).
- Primary action: Tap a recent day in the history grid to toggle it.
- Secondary actions: Edit habit.
- Loading/empty/error/success states: Standard; "not enough data yet" for new habits' charts.
- Next destination: My Habits, Edit Habit.

### Screen: Todos
- Route: `/todos`
- Purpose: Manage all tasks.
- Entry conditions: Active session.
- Main content: Today / Upcoming / Completed tabs, task rows with checkbox, priority, due date.
- Primary action: Toggle task completion.
- Secondary actions: "+ Add Task"; edit/delete a task.
- Loading/empty/error/success states: Standard per tab.
- Next destination: Add/Edit Todo.

### Screen: Add / Edit Todo
- Route: `/todos/new`, `/todos/:id/edit`
- Purpose: Create or modify a task.
- Entry conditions: From Todos or Dashboard.
- Main content: Title, due date, priority, recurrence fields.
- Primary action: Save.
- Secondary actions: Cancel; (edit mode) Delete.
- Loading/error/success states: Standard.
- Next destination: Todos.

### Screen: Focus Timer
- Route: `/timer`
- Purpose: Run Pomodoro sessions.
- Entry conditions: Active session.
- Main content: Countdown ring, Start/Pause/Reset controls, today's session count.
- Primary action: Start timer.
- Secondary actions: Pause, Reset.
- Success state: Session logged when timer completes naturally (not on manual reset).
- Next destination: Stays on Timer; session count updates live.

### Screen: Journal
- Route: `/journal`, `/journal/:date`
- Purpose: Write/read a daily note.
- Entry conditions: Active session.
- Main content: Date header with prev/next navigation, note textarea.
- Primary action: Save entry.
- Secondary actions: Browse to a different date.
- Loading/empty/error/success states: Standard; empty box for dates with no entry yet.
- Next destination: Stays on Journal, browsing dates.

### Screen: Leaderboard
- Route: `/leaderboard`
- Purpose: Compare streaks across users.
- Entry conditions: Active session.
- Main content: Ranked list, metric toggle (current/longest streak), logged-in user's row highlighted.
- Primary action: Toggle ranking metric.
- Secondary actions: N/A.
- Loading/empty/error/success states: Standard.
- Next destination: N/A (standalone view).

### Screen: Admin Panel
- Route: `/admin`
- Purpose: List all registered users (admin only).
- Entry conditions: Active session with `is_admin = true`; any other user attempting this route is redirected away (both client-side nav hidden and server-side access blocked).
- Main content: Search field, table of users (username, joined date, habit count, todo count).
- Primary action: N/A (read-only for v1).
- Secondary actions: Search/filter.
- Loading/empty/error/success states: Standard.
- Next destination: N/A.

## 4. Primary User Journey
1. New visitor lands on Login, taps "Create one" -> Create Account -> fills form -> auto-logged-in -> lands on Dashboard.
2. Dashboard is empty -> taps "+" -> adds a habit and a todo.
3. Returns to Dashboard -> checks off today's habit and todo -> streak/stats update.
4. Later, visits Habit Detail -> sees the pie/line charts starting to populate.
5. Starts a Focus Timer session while working; it completes and is logged.
6. End of day, writes a quick Journal entry.
7. Next day, Dashboard shows yesterday's leftover items (if any weren't completed).
8. Occasionally checks the Leaderboard to see how their streak compares.

## 5. Secondary Journeys
- Editing a forgotten check-in from a few days ago via Habit Detail's history grid.
- An admin logging in and visiting `/admin` to see the full user list.
- A returning user whose session expired gets redirected to Login, logs back in, and resumes on Dashboard.

## 6. Decision Points
- Decision: Is the submitted username already taken?
  - Condition: Uniqueness check on signup.
  - Result: If taken, reject with inline error; if free, create account.
  - Destination: Dashboard (success) or stays on Create Account (error).
- Decision: Is the requesting user's session valid and does it match the resource being accessed?
  - Condition: Session/ownership check on every data-modifying API call.
  - Result: If invalid, 401 and redirect to Login; if valid but not the owner, reject; if valid and owner, proceed.
  - Destination: Varies (Login redirect or normal flow continues).
- Decision: Has a recurring todo's period (day/week/month) ended without completion?
  - Condition: Server-side date comparison against the todo's recurrence and completion record.
  - Result: If ended and incomplete, flagged as leftover; otherwise not.
  - Destination: Surfaced in the Dashboard's leftovers section.

## 7. Edge Cases and Recovery
- Duplicate username on signup: blocked with a clear inline message.
- Session expires mid-use: any subsequent action redirects cleanly to Login rather than failing silently.
- Non-admin manually navigates to `/admin`: redirected away (and the underlying API call is rejected server-side regardless).
- Editing a habit check-in outside the allowed 7-day window: the UI simply doesn't allow tapping those days (visually flat/non-interactive).
- Timer reset before completion: no session is logged — only a full countdown counts.

## 8. Navigation Rules
- Global navigation: A persistent nav bar/menu (Dashboard, Habits, Todos, Timer, Journal, Leaderboard, and Admin Panel if applicable, Logout) visible on all logged-in screens.
- Back behavior: Standard browser back navigation works since each screen has its own route.
- Protected routes: All routes except `/login` and `/signup` require an active session; `/admin` additionally requires `is_admin = true`.
- Deep links: Habit Detail and Journal date views are bookmarkable/shareable-by-URL for the logged-in user's own convenience.
