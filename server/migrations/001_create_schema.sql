-- HabitTrack Database Schema (all 7 tables)

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username));

-- 2. habits
CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_frequency TEXT NOT NULL DEFAULT 'daily',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_habits_user_archived ON habits (user_id, is_archived);

-- 3. habit_checkins
CREATE TABLE IF NOT EXISTS habit_checkins (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_habit_checkins_habit_date UNIQUE (habit_id, date)
);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_habit_date ON habit_checkins (habit_id, date);

-- 4. todos
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  recurrence TEXT NOT NULL DEFAULT 'one_time' CHECK (recurrence IN ('one_time', 'daily', 'weekly', 'monthly')),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_todos_user_due_date ON todos (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_todos_user_recurrence ON todos (user_id, recurrence);

-- 5. todo_completions
CREATE TABLE IF NOT EXISTS todo_completions (
  id SERIAL PRIMARY KEY,
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_todo_completions_todo_period UNIQUE (todo_id, period_start)
);

-- 6. journal_entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_journal_entries_user_date UNIQUE (user_id, date)
);

-- 7. timer_sessions
CREATE TABLE IF NOT EXISTS timer_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER NOT NULL DEFAULT 25
);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_completed ON timer_sessions (user_id, completed_at);
