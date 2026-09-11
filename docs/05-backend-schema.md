# Backend Schema

## 1. Data Overview
- Database type: Supabase (hosted Postgres, free tier).
- Main data domains: Users (auth + profile), Habits + Checkins, Todos + recurrence/leftover tracking, Journal entries, Focus-timer sessions.
- Ownership model: Every table except `users` itself has a `user_id` foreign key; all queries are scoped to the logged-in user's own data except the leaderboard (which reads aggregated streak values across users) and the admin panel (which reads across all users, admin-only).

## 2. Authentication and Authorization
- User identity: `users` table, custom (not Supabase Auth).
- Sign-in methods: Username + password only.
- Roles: `is_admin` boolean flag on the `users` table (no separate roles table needed at this scale).
- Permissions: Every non-auth endpoint requires a valid session; data-modifying endpoints additionally check that the resource's `user_id` matches the session's user; admin endpoints additionally check `is_admin = true`.
- Session handling: Signed session token issued on login/signup, stored in an HTTP-only cookie; validated on every request.

## 3. Tables

### Table: `users`
- `id` — integer/uuid — required — primary key.
- `username` — text — required — unique — validation: non-empty, reasonable length, no spaces.
- `password_hash` — text — required — bcrypt hash, never the plain password.
- `is_admin` — boolean — required — default `false`.
- `created_at` — timestamp — auto-set on insert.
- Indexes: unique index on `username` (for both uniqueness enforcement and fast login lookups).

### Table: `habits`
- `id` — integer — required — primary key.
- `user_id` — integer — required — foreign key -> `users.id`.
- `name` — text — required — non-empty, max length ~100.
- `target_frequency` — text — required — default `"daily"` (e.g. `"daily"`, `"3x_week"`).
- `is_archived` — boolean — required — default `false`.
- `created_at` — timestamp — auto-set.
- Indexes: `(user_id, is_archived)` for fast "today's active habits" lookups.

### Table: `habit_checkins`
- `id` — integer — required — primary key.
- `habit_id` — integer — required — foreign key -> `habits.id`.
- `date` — date (ISO) — required.
- `created_at` — timestamp — auto-set.
- Unique constraint: `(habit_id, date)`.
- Index: `(habit_id, date)`.
- Semantics: a row existing means "completed that day"; un-checking deletes the row (same approach as the earlier simpler design).

### Table: `todos`
- `id` — integer — required — primary key.
- `user_id` — integer — required — foreign key -> `users.id`.
- `title` — text — required — non-empty.
- `due_date` — date — optional.
- `priority` — text — required — default `"medium"` — one of `"low" | "medium" | "high"`.
- `recurrence` — text — required — default `"one_time"` — one of `"one_time" | "daily" | "weekly" | "monthly"`.
- `is_completed` — boolean — required — default `false` (for one-time todos; recurring todos use `todo_completions` below instead).
- `created_at` — timestamp — auto-set.
- Indexes: `(user_id, due_date)`; `(user_id, recurrence)`.

### Table: `todo_completions` (for recurring todos — tracks completion per period)
- `id` — integer — required — primary key.
- `todo_id` — integer — required — foreign key -> `todos.id`.
- `period_start` — date — required — the start date of the day/week/month period this completion applies to.
- `completed_at` — timestamp — required — when it was marked done.
- Unique constraint: `(todo_id, period_start)` — one completion record per recurring todo per period.
- Purpose: lets "leftover" detection compare, for each recurring todo, whether a `todo_completions` row exists for the most recently *ended* period.

### Table: `journal_entries`
- `id` — integer — required — primary key.
- `user_id` — integer — required — foreign key -> `users.id`.
- `date` — date — required.
- `content` — text — required (can be short).
- `updated_at` — timestamp — auto-updated on edit.
- Unique constraint: `(user_id, date)` — one entry per user per day.

### Table: `timer_sessions`
- `id` — integer — required — primary key.
- `user_id` — integer — required — foreign key -> `users.id`.
- `completed_at` — timestamp — required — set when a session runs to completion (not on manual reset).
- `duration_minutes` — integer — required — default 25.
- Index: `(user_id, completed_at)` for daily/weekly session counts.

## 4. Relationships
- One-to-many: `users` -> `habits`, `habits` -> `habit_checkins`, `users` -> `todos`, `todos` -> `todo_completions`, `users` -> `journal_entries`, `users` -> `timer_sessions`.
- Delete behavior: Habits and todos are archived/soft-deleted where the PRD calls for it (habits explicitly; todos can hard-delete since there's no stated need to preserve deleted-task history). Deleting a `user` (not expected in normal v1 use) would cascade to all their owned rows.

## 5. Access Rules
- `users`: a user can read/update only their own row (e.g. changing password later); admins can read all rows via the Admin Panel endpoint only.
- `habits`, `habit_checkins`, `todos`, `todo_completions`, `journal_entries`, `timer_sessions`: create/read/update/delete restricted to the owning `user_id`, enforced server-side on every request — never trust a `user_id` sent from the frontend, always derive it from the validated session.
- Leaderboard: a special read-only aggregate query across all users' `habits`/`habit_checkins` to compute each user's best current/longest streak — does not expose raw habit names or other users' private data, only username + streak number.

## 6. Core Data Operations
- `CreateUser(username, password)` — hashes password, inserts into `users`.
- `AuthenticateUser(username, password)` — looks up by username, compares hash, issues session.
- `RecordHabitCheckin(habit_id, date)` / `RemoveHabitCheckin(habit_id, date)` — same as the earlier simpler design.
- `CalculateHabitStreaks(habit_id)` — application logic over `habit_checkins`, same approach as before.
- `CreateTodo(...)`, `UpdateTodo(...)`, `DeleteTodo(...)` — standard CRUD, scoped to `user_id`.
- `RecordTodoCompletion(todo_id, period_start)` — for recurring todos, inserts into `todo_completions` for the current period.
- `GetLeftovers(user_id)` — for each active recurring todo, determines the most recently *ended* period (e.g. yesterday for daily, last week for weekly, last month for monthly) and checks whether a matching `todo_completions` row exists; if not, includes it in the leftover list.
- `GetLeaderboard(metric)` — aggregates best current/longest streak per user across their habits, sorted descending.
- `LogTimerSession(user_id)` — inserts a row when a timer completes naturally.
- `GetOrCreateJournalEntry(user_id, date)` / `SaveJournalEntry(user_id, date, content)`.

## 7. File Storage
- Not applicable — no file uploads anywhere in this app.

## 8. Data Integrity and Security
- Validation: enforced both client-side (fast feedback) and server-side (source of truth) — never trust client-side validation alone.
- Transactions: recommended around any multi-step write (e.g. creating a user + initial setup, if that ever exists) to avoid partial writes.
- Sensitive data: passwords are the only sensitive field; always hashed, never returned by any API response, never logged.
- Audit requirements: none required for v1 beyond `created_at`/`updated_at` timestamps already present on relevant tables.

## 9. Migration and Seed Data
- Migrations: a single setup script (or Supabase's migration tooling) creating all tables above; run once against the free-tier Supabase project.
- Seed data: none required — each user's data starts empty on signup.

## 10. Risks and Open Questions
- Risk: `GetLeftovers` and streak calculation are the two places with real date-logic complexity — isolate both into clearly named, independently testable functions rather than inlining date math throughout the codebase.
- Open question: Week-start convention (Monday vs. Sunday) for `period_start` on weekly recurrence — pin this down as one explicit constant before implementing leftover tracking, since it affects every weekly todo's boundary calculation.
- Open question: For the leaderboard's "best streak," decide whether archived habits still count toward a user's best streak, or only active ones — recommend: active habits only, to avoid rewarding streaks on habits someone has since abandoned.
