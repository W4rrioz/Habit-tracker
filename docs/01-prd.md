# Product Requirements Document

## 1. Product Overview
- Product name: HabitTrack
- One-sentence description: A multi-user daily productivity app combining habits, todos, a focus timer, a journal, and a leaderboard, with visual stats and an admin view.
- Problem being solved: Daily productivity tools are usually scattered across separate apps; HabitTrack brings the core loop (habits + tasks + focus + reflection) into one dashboard.
- Why this product should exist: Personal daily-use tool, and a substantial full-stack project covering real authentication, a real database, and real data visualization.

## 2. Target Users
- Primary user: The builder, using it daily for habits, tasks, and focus sessions.
- Their current problem: No single place to see today's habits and tasks together, or to visualize consistency over time.
- Their desired outcome: One dashboard, checked once or a few times a day, that clearly shows what's done and what's left — plus a way to look back and see patterns.
- Secondary users: Friends/classmates who create their own accounts and appear on the shared leaderboard.

## 3. Core User Outcome
Create an account, log in, and land on a dashboard showing today's habits and todos in one place. Check things off throughout the day. At the end of a day/week/month, see clearly what recurring items were left incomplete. Look back at any habit or todo category and see visual stats (pie/line charts) of consistency over time. Compare streaks with other users on the leaderboard.

## 4. Core Features

### Feature: Authentication
- User need: Own account, private data, ability to return and pick up where they left off.
- What it does: Separate Create Account and Login pages; username + password; passwords hashed before storage; session kept across visits.
- Inputs: Username, password (+ confirm password on signup).
- Expected output: A logged-in session tied to a user record; all subsequent data (habits, todos, journal) scoped to that user.
- Acceptance criteria: Cannot create two accounts with the same username; cannot log in with a wrong password; session persists across a page refresh; logging out clears the session.
- Error/empty states: Username already taken (signup); wrong username/password (login) — both shown as clear, non-technical inline messages.

### Feature: Daily Dashboard
- User need: One place to see everything relevant to today.
- What it does: Combines today's habit check-ins, today's todos, and any "leftover" flagged items from the last completed day/week/month, in one page.
- Inputs: The logged-in user's habits, todos, and leftover records.
- Expected output: A single scannable view — no need to visit separate pages just to see today's state.
- Acceptance criteria: Checking a habit or todo from the dashboard updates it the same way as doing so from its own page (no separate/duplicated logic).
- Error/empty states: New user with nothing set up yet shows a friendly prompt to add their first habit/todo.

### Feature: Habits
- User need: Track recurring personal habits with visible consistency.
- What it does: Add/edit/archive habits (name + target frequency); daily check-in with a 7-day edit window; current & longest streak calculation; a history grid; stats view with a pie chart (completion breakdown) and a line/bar chart (trend over time).
- Inputs: Habit details on creation; daily check-in taps; historical edits within the allowed window.
- Expected output: Accurate streaks and accurate charts that reflect the real stored history.
- Acceptance criteria: Streak calculation matches manual verification against a calendar for at least a few constructed test scenarios; editing a past day correctly recalculates streaks and charts.
- Error/empty states: Brand-new habit shows streak 0 and "not enough data yet" instead of a broken chart.

### Feature: Todo List
- User need: Track one-off and recurring tasks separately from habits.
- What it does: Add/edit/delete tasks with title, optional due date, priority (low/medium/high), and recurrence (one-time/daily/weekly/monthly); views split into Today, Upcoming, and Completed.
- Inputs: Task details on creation/edit; completion toggles.
- Expected output: Tasks correctly sorted into their view based on due date and completion state.
- Acceptance criteria: A task due today appears under "Today"; a completed task moves to "Completed"; a future-dated task appears under "Upcoming."
- Error/empty states: Empty title rejected; no tasks in a given view shows a simple friendly empty state, not a blank screen.

### Feature: Leftover Tracking
- User need: Know what recurring tasks were missed once a period ends, without needing an external calendar.
- What it does: For daily/weekly/monthly recurring todos, once their period ends (based on system date), any instance not marked complete is flagged as "leftover" and surfaced on the dashboard.
- Inputs: Recurring todo definitions + completion records + current system date.
- Expected output: An accurate, up-to-date list of missed recurring items per period.
- Acceptance criteria: A daily recurring task not completed by end of day correctly appears as "leftover" the next day; same logic verified for weekly and monthly on their respective boundaries.
- Error/empty states: No leftovers shows a positive "all caught up" message, not an empty grey box.

### Feature: Charts & Visualization
- User need: See patterns, not just raw numbers.
- What it does: Pie charts showing completion vs. missed ratio (per habit, per todo category, or overall); line/bar charts showing completions over a selected period (e.g. last 30 days).
- Inputs: Stored completion history for habits and todos.
- Expected output: Charts that update correctly whenever underlying data changes (including retroactive edits).
- Acceptance criteria: Chart values are verifiably consistent with the raw stored data for a few manually checked cases.
- Error/empty states: Insufficient data shows a "not enough data yet" message instead of an empty or broken chart.

### Feature: Focus Timer
- User need: A simple way to do focused work sessions and track them.
- What it does: A Pomodoro-style countdown timer (default 25 min) with start/pause/reset; each completed session is logged and counted as a daily stat.
- Inputs: Start/pause/reset taps.
- Expected output: An accurate running countdown; a session is only logged as "completed" if it runs to zero (not on early reset).
- Acceptance criteria: Session count on the dashboard/stats matches the number of timers actually completed that day.
- Error/empty states: N/A — timer always has a clear default state.

### Feature: Daily Journal
- User need: A quick space for daily reflection, tied to the same day as habit/todo data.
- What it does: One short text note per calendar date, browsable by date (previous/next).
- Inputs: Free text entry.
- Expected output: Entry saved and retrievable by date; only one entry per date per user.
- Acceptance criteria: Writing and saving an entry for today, then navigating away and back, shows the same saved text.
- Error/empty states: No entry for a browsed date shows an empty editable box, not an error.

### Feature: Leaderboard
- User need: See how consistency compares across users, for motivation.
- What it does: Ranks all users by current streak or longest streak (toggleable), showing username and streak value; highlights the logged-in user's own row.
- Inputs: All users' streak data (their best/current habit streak, or an aggregate — to be defined precisely in the Backend Schema).
- Expected output: An accurate, correctly-sorted ranking.
- Acceptance criteria: Ranking updates correctly as streaks change; the logged-in user can always find their own row highlighted.
- Error/empty states: New user with no streaks yet shown at the bottom, not excluded from the list.

### Feature: Admin Panel
- User need: Visibility into all registered users, for the app's owner.
- What it does: A page visible only to users with `is_admin = true`, listing all users with username, joined date, habit count, and todo count.
- Inputs: N/A (read-only view).
- Expected output: An accurate, complete table of all users.
- Acceptance criteria: Non-admin users cannot access this page (neither via UI nor by navigating to its route directly); admin users see all registered users, including ones created after the admin.
- Error/empty states: N/A beyond standard access denial for non-admins.

## 5. Scope

### Included in version one
- Everything listed in Section 4 above.

### Explicitly excluded from version one
- Notifications/reminders
- External calendar sync (Google Calendar) — deliberately replaced with internal system-date-based recurrence
- Editing/removing other users' data from the admin panel (read-only for v1)
- Mobile native app

### Possible later additions
- Admin actions beyond viewing (e.g. deactivating a user)
- Notifications
- Habit/todo categories or tags
- Data export

## 6. User Stories
- As a user, I want to create an account and log in, so that my data is private and saved.
- As a user, I want to see today's habits and todos together, so that I don't have to check two separate pages.
- As a user, I want to see a "leftover" list at the end of a day/week/month, so that I know what I missed.
- As a user, I want visual charts of my consistency, so that I can spot patterns at a glance.
- As a user, I want a focus timer, so that I can log real work sessions.
- As a user, I want a daily journal entry, so that I have a quick record of how each day went.
- As a user, I want to see a leaderboard, so that I'm motivated by comparing streaks with others.
- As the app owner, I want an admin panel, so that I can see who's using the app.

## 7. Functional Requirements
- All user data must be scoped to the logged-in user (habits, todos, journal entries are private; only streak values are shared on the leaderboard).
- Passwords must be hashed before storage; plain-text passwords must never be stored or logged.
- Streak and leftover-tracking logic must be based on the system's current date, not any external calendar.
- The admin panel route must be inaccessible to non-admin users.

## 8. Non-Functional Requirements
- Performance: Fast (<1s) response for check-ins, timer actions, and page loads — dataset size stays small even with multiple users at this scale.
- Accessibility: Reasonable contrast (especially given the light blue/cyan theme) and adequate tap targets for mobile use.
- Privacy: Passwords hashed; user data private except leaderboard streak values.
- Reliability: No data loss — this matters more than any other non-functional requirement, since streak/journal history has real personal value once it accumulates.

## 9. Success Criteria
- Genuinely used daily across habits, todos, timer, and journal for several weeks without data loss or incorrect streaks.
- At least one other person (friend/classmate) creates an account and appears on the leaderboard.
- Admin panel correctly restricted to the admin account only.
- Charts and leftover tracking are verifiably accurate against manually checked data.

## 10. Assumptions and Open Questions
- Assumption: Username+password auth is sufficient; no email verification or password reset flow in v1 (would require email sending infrastructure, out of scope).
- Assumption: Leaderboard ranks by a single metric at a time (current streak or longest streak, user-toggleable), not a combined score.
- Open question: For leaderboard purposes, is "streak" the single best habit streak a user has, or an aggregate across all their habits? Recommend: best single current/longest streak, since it's simplest to calculate and explain.
- Open question: Exact leftover-tracking boundary rules for weekly/monthly recurrence (e.g. does a week start Monday or Sunday?) — should be pinned down explicitly in the Backend Schema before implementation, since it's the trickiest date-logic in the app.
