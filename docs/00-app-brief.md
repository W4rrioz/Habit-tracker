# App Brief

App name: HabitTrack

One-line idea: A multi-user productivity web app combining habit tracking, a todo list, a focus timer, a daily journal, and a leaderboard — with your own login, visual stats, and an admin view.

Problem it solves: Scattered productivity tools (a habit app here, a todo app there, a timer somewhere else) make it hard to see your whole day in one place. HabitTrack combines the core daily-productivity loop into one app you actually own and understand end to end.

Who it is for: Primarily yourself, but built for real multi-user signup so friends/classmates could use it too (hence login + leaderboard).

The main action a user should complete: Log in, land on the daily dashboard, see today's habits and todos together, check things off, and watch streaks/stats build up over time.

Must-have features:
- Authentication: create account (separate page) + login (separate page), username + password, hashed, session-based
- Daily Dashboard: today's habits + today's todos + leftover recurring items, one combined view
- Habits: add/edit/archive, daily check-in (+ edit last 7 days), current & longest streak, history view, stats (pie chart completion breakdown + line/bar trend chart)
- Todo List: add/edit/delete, priority (low/medium/high), recurrence (one-time/daily/weekly/monthly), views for Today/Upcoming/Completed
- Leftover Tracking: at the end of each day/week/month, recurring todos not completed in that period are flagged as "left over" (based on system date, no external calendar)
- Charts & Visualization: pie charts (completion breakdown) and line/bar charts (trends) for both habits and todos
- Focus Timer: Pomodoro-style timer (start/pause/reset), logs completed sessions as a daily stat
- Daily Journal: a short text note per day, browsable by date
- Leaderboard: ranks users by current or longest streak, highlights the logged-in user's own position
- Admin Panel: visible only to users with `is_admin = true`, shows a table of all registered users (username, joined date, habit/todo counts)

Nice-to-have features (explicitly deferred, not in v1):
- Notifications/reminders
- Real external calendar sync (Google Calendar) — considered and intentionally dropped in favor of internal system-date-based recurrence, to avoid OAuth complexity
- Mobile native app

Platform: Web app (browser), responsive for desktop and mobile browser use.

Business model: N/A — personal project, but built with real multi-user support.

Important constraints:
- Deadline: flexible, built around school workload — no hard deadline
- Budget: $0 — free-tier tools only
- Required tools: Supabase (free-tier Postgres database) for storage; custom username/password auth (not Supabase's built-in auth service, since the requirement is plain username+password); React frontend; Node/Express backend
- Privacy/security: passwords must be hashed (never stored in plain text); each user's data (habits, todos, journal entries) is private to them except streak data shown on the leaderboard

Visual direction: Light blue/cyan overall theme, heavily rounded corners (cards, buttons, inputs), simple and minimal — calm and friendly, not cluttered or corporate. See `08-ui-page-prompts.md` for the full per-page design spec.

References: Habit trackers like Loop/Streaks (for the habit side), Todoist (for the todo side), simple Pomodoro apps — but combined into one cohesive daily dashboard rather than separate apps.
