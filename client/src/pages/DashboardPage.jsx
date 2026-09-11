import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate() {
  const d = new Date();
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-US', options);
}

export default function DashboardPage() {
  const [habits, setHabits] = useState([]);
  const [todosData, setTodosData] = useState({ today: [], upcoming: [], completed: [], leftovers: [] });
  const [timerStats, setTimerStats] = useState({ total_sessions: 0, total_minutes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action loading states
  const [actionLoading, setActionLoading] = useState({});

  // Quick Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('habit'); // 'habit' | 'todo'
  const [habitForm, setHabitForm] = useState({ name: '', target_frequency: 'daily' });
  const [todoForm, setTodoForm] = useState({
    title: '',
    due_date: getTodayDateStr(),
    priority: 'medium',
    recurrence: 'one_time'
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const todayStr = getTodayDateStr();

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      const [habitsRes, todosRes, timerRes] = await Promise.all([
        fetch('/api/habits', { credentials: 'include' }),
        fetch('/api/todos', { credentials: 'include' }),
        fetch('/api/timer/today', { credentials: 'include' }).catch(() => null)
      ]);

      if (!habitsRes.ok) {
        throw new Error('Could not load habits data.');
      }
      if (!todosRes.ok) {
        throw new Error('Could not load todos data.');
      }

      const habitsJson = await habitsRes.json();
      const todosJson = await todosRes.json();

      setHabits(Array.isArray(habitsJson) ? habitsJson : []);
      setTodosData({
        today: todosJson.today || [],
        upcoming: todosJson.upcoming || [],
        completed: todosJson.completed || [],
        leftovers: todosJson.leftovers || []
      });

      if (timerRes && timerRes.ok) {
        const timerJson = await timerRes.json();
        setTimerStats({
          total_sessions: timerJson.total_sessions || 0,
          total_minutes: timerJson.total_minutes || 0
        });
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // --- Habit Check-in Toggle ---
  async function handleToggleHabit(habit) {
    const key = `habit_${habit.id}`;
    if (actionLoading[key]) return;

    // Optimistic UI update
    const previousCompleted = habit.is_completed_today;
    setHabits(prev =>
      prev.map(h => {
        if (h.id !== habit.id) return h;
        const newCompleted = !previousCompleted;
        const streakChange = newCompleted ? 1 : -1;
        return {
          ...h,
          is_completed_today: newCompleted,
          isCompletedToday: newCompleted,
          current_streak: Math.max(0, (h.current_streak || 0) + streakChange)
        };
      })
    );

    try {
      setActionLoading(prev => ({ ...prev, [key]: true }));
      const res = await fetch(`/api/habits/${habit.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date: todayStr })
      });

      if (!res.ok) {
        throw new Error('Failed to update habit check-in.');
      }

      const updated = await res.json();
      setHabits(prev =>
        prev.map(h => {
          if (h.id !== habit.id) return h;
          return {
            ...h,
            current_streak: updated.current_streak,
            currentStreak: updated.currentStreak,
            longest_streak: updated.longest_streak,
            longestStreak: updated.longestStreak,
            total_checkins: updated.total_checkins,
            totalCheckins: updated.totalCheckins,
            is_completed_today: updated.is_completed_today,
            isCompletedToday: updated.isCompletedToday,
            last_7_days: updated.last_7_days || h.last_7_days
          };
        })
      );
    } catch (err) {
      console.error(err);
      loadDashboardData();
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  // --- Todo Toggle ---
  async function handleToggleTodo(todo) {
    const key = `todo_${todo.id}`;
    if (actionLoading[key]) return;

    try {
      setActionLoading(prev => ({ ...prev, [key]: true }));
      const res = await fetch(`/api/todos/${todo.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (!res.ok) {
        throw new Error('Failed to update task.');
      }

      const refreshRes = await fetch('/api/todos', { credentials: 'include' });
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        setTodosData({
          today: refreshJson.today || [],
          upcoming: refreshJson.upcoming || [],
          completed: refreshJson.completed || [],
          leftovers: refreshJson.leftovers || []
        });
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error updating task.');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  // --- Leftover Complete Toggle ---
  async function handleCompleteLeftover(leftover) {
    const key = `leftover_${leftover.id}_${leftover.leftover_period_start}`;
    if (actionLoading[key]) return;

    try {
      setActionLoading(prev => ({ ...prev, [key]: true }));
      const res = await fetch(`/api/todos/${leftover.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ period_start: leftover.leftover_period_start })
      });

      if (!res.ok) {
        throw new Error('Failed to complete leftover task.');
      }

      const refreshRes = await fetch('/api/todos', { credentials: 'include' });
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        setTodosData({
          today: refreshJson.today || [],
          upcoming: refreshJson.upcoming || [],
          completed: refreshJson.completed || [],
          leftovers: refreshJson.leftovers || []
        });
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error completing leftover.');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  // --- Quick Add Submit ---
  async function handleQuickAddSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      if (modalType === 'habit') {
        if (!habitForm.name.trim()) {
          setFormError('Please enter a habit name.');
          setFormSubmitting(false);
          return;
        }

        const res = await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: habitForm.name.trim(),
            target_frequency: habitForm.target_frequency
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to create habit.');
        }

        setHabitForm({ name: '', target_frequency: 'daily' });
      } else {
        if (!todoForm.title.trim()) {
          setFormError('Please enter a task title.');
          setFormSubmitting(false);
          return;
        }

        const res = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: todoForm.title.trim(),
            due_date: todoForm.due_date || null,
            priority: todoForm.priority,
            recurrence: todoForm.recurrence
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to create task.');
        }

        setTodoForm({
          title: '',
          due_date: getTodayDateStr(),
          priority: 'medium',
          recurrence: 'one_time'
        });
      }

      setIsModalOpen(false);
      await loadDashboardData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  }

  // --- Today's Todos Aggregation ---
  const todayTodoIds = new Set((todosData.today || []).map(t => t.id));
  const completedOneTimeToday = (todosData.completed || []).filter(t => {
    if (t.recurrence !== 'one_time') return false;
    if (todayTodoIds.has(t.id)) return false;
    if (t.due_date) return t.due_date === todayStr;
    return t.created_at && t.created_at.startsWith(todayStr);
  });

  const dashboardTodos = [...(todosData.today || []), ...completedOneTimeToday];

  // --- Overall Daily Progress Calculation ---
  const habitsTotal = habits.length;
  const habitsDone = habits.filter(h => h.is_completed_today).length;

  const todosTotal = dashboardTodos.length;
  const todosDone = dashboardTodos.filter(t => t.is_completed).length;

  const totalItems = habitsTotal + todosTotal;
  const totalDone = habitsDone + todosDone;
  const progressPercent = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  function getProgressMessage() {
    if (totalItems === 0) {
      return 'Add your first habit or task to begin cultivating your mindful day.';
    }
    if (progressPercent === 100) {
      return 'Incredible! You have completed all scheduled habits and tasks for today.';
    }
    if (progressPercent >= 66) {
      return 'Mindful momentum is strong. You are almost at 100%!';
    }
    if (progressPercent >= 33) {
      return 'Great progress. Keep moving forward one calm step at a time.';
    }
    return 'A calm, intentional day begins with a single check-in.';
  }

  const getPriorityBadge = (priority) => {
    if (priority === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[11px] font-semibold shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-error"></span> High
        </span>
      );
    }
    if (priority === 'low') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[11px] font-medium shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-outline"></span> Low
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-label-sm text-[11px] font-semibold shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Med
      </span>
    );
  };

  const getMilestoneBadge = (streak) => {
    if (streak >= 100) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
          💯 100d
        </span>
      );
    }
    if (streak >= 30) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
          🌟 30d
        </span>
      );
    }
    if (streak >= 7) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
          ⚡ 7d
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="w-full max-w-[560px] mx-auto py-16 text-center text-xs text-on-surface-variant font-medium">
        Loading today's dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-[560px] mx-auto py-12 text-center">
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/20 flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-error">error_outline</span>
          <h2 className="font-headline text-lg font-bold text-on-surface">Could not load dashboard</h2>
          <p className="font-body text-xs text-on-surface-variant max-w-sm">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px] mx-auto pb-16 flex flex-col gap-4">
      {/* Top Header & Actions (No weather widget or user avatar photo per PRD) */}
      <div className="flex items-start justify-between mt-2 gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            <span>{formatDisplayDate()}</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1">
            Daily Dashboard
          </h1>
          <p className="font-body text-xs text-on-surface-variant mt-0.5">
            One calm view for today's habits, tasks, and reflections.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pt-1">
          <button
            onClick={() => {
              setModalType('habit');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1 bg-primary text-on-primary hover:bg-primary-container px-3.5 py-2 rounded-full shadow-sm active:scale-95 transition-all text-xs font-semibold"
            title="Quick Add Habit or Task"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* Mindful Momentum Progress Banner */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">spa</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Mindful Momentum
              </span>
              <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
                Today's Progress
              </h2>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-secondary leading-tight">
              {progressPercent}%
            </span>
            <span className="block text-[10px] text-on-surface-variant font-medium">
              ({totalDone}/{totalItems})
            </span>
          </div>
        </div>

        <p className="font-body text-xs text-on-surface">
          {getProgressMessage()}
        </p>

        {/* Progress Bar Track & Fill */}
        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
          <div
            className="bg-secondary h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/10 flex-wrap">
          <span>
            <strong className="text-on-surface">Habits:</strong> {habitsDone} of {habitsTotal} checked
          </span>
          <span>•</span>
          <span>
            <strong className="text-on-surface">Todos:</strong> {todosDone} of {todosTotal} completed
          </span>
          {todosData.leftovers.length > 0 && (
            <>
              <span>•</span>
              <span className="text-amber-800 font-semibold">
                {todosData.leftovers.length} leftover task{todosData.leftovers.length === 1 ? '' : 's'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Leftovers Section */}
      {todosData.leftovers.length > 0 ? (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5">
              warning
            </span>
            <div>
              <h3 className="font-headline text-xs font-bold text-amber-900">
                Missed Recurring Leftovers ({todosData.leftovers.length})
              </h3>
              <p className="font-body text-[11px] text-amber-800 mt-0.5">
                These recurring tasks ended without being checked off. Complete them now to maintain your rhythm.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {todosData.leftovers.map(item => {
              const actionKey = `leftover_${item.id}_${item.leftover_period_start}`;
              const isSubmitting = actionLoading[actionKey];

              return (
                <div
                  key={`${item.id}-${item.leftover_period_start}`}
                  className="bg-white/90 rounded-xl p-3 border border-amber-200/50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-headline text-xs font-bold text-on-surface truncate">
                        {item.title}
                      </span>
                      {getPriorityBadge(item.priority)}
                    </div>
                    <span className="text-[10px] text-amber-800 font-medium block mt-0.5">
                      {item.recurrence.toUpperCase()} • Period started {item.leftover_period_start}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleCompleteLeftover(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shrink-0 shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    <span>{isSubmitting ? '...' : 'Complete'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-sm border border-outline-variant/20 flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
          <span>All caught up! No unfinished recurring items from previous periods.</span>
        </div>
      )}

      {/* Today's Habits Section */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-headline text-sm font-bold text-on-surface">Today's Habits</h2>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
              {habitsDone} / {habitsTotal} checked
            </span>
          </div>
          <Link
            to="/habits"
            className="text-xs font-semibold text-primary hover:text-primary-container transition-colors"
          >
            Manage Habits →
          </Link>
        </div>

        {habits.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/20 text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-outline-variant">spa</span>
            <p className="font-headline text-xs font-semibold text-on-surface">No habits yet</p>
            <p className="font-body text-[11px] text-on-surface-variant max-w-xs">
              Build consistency by adding your first daily or weekly rhythm.
            </p>
            <button
              onClick={() => {
                setModalType('habit');
                setIsModalOpen(true);
              }}
              className="mt-1 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Add Habit</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {habits.map(habit => {
              const isChecked = Boolean(habit.is_completed_today);
              const isBusy = actionLoading[`habit_${habit.id}`];

              return (
                <div
                  key={habit.id}
                  className={`bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-outline-variant/20 flex items-center justify-between gap-3 hover:shadow-md transition-all ${
                    isChecked ? 'opacity-90' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      aria-label={`Check-in ${habit.name}`}
                      disabled={isBusy}
                      onClick={() => handleToggleHabit(habit)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isChecked
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'border-2 border-outline-variant hover:border-primary text-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/habits/${habit.id}`}
                          className={`font-headline text-xs font-bold text-on-surface hover:text-primary transition-colors truncate ${
                            isChecked ? 'line-through text-on-surface-variant' : ''
                          }`}
                        >
                          {habit.name}
                        </Link>
                        <span className="px-2 py-0.2 rounded-full bg-surface-container text-on-surface-variant text-[9px] font-semibold uppercase">
                          {habit.target_frequency || 'Daily'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-secondary">
                          <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
                          <span>{habit.current_streak || 0}d</span>
                        </span>
                        {getMilestoneBadge(habit.current_streak)}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/habits/${habit.id}`}
                    className="p-1 rounded-full text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0"
                    title="Habit Details"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Today's Todos Section */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-headline text-sm font-bold text-on-surface">Today's Todos</h2>
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-medium">
              {todosTotal - todosDone} pending • {todosDone} done
            </span>
          </div>
          <Link
            to="/todos"
            className="text-xs font-semibold text-primary hover:text-primary-container transition-colors"
          >
            View All Todos →
          </Link>
        </div>

        {dashboardTodos.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/20 text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-outline-variant">task_alt</span>
            <p className="font-headline text-xs font-semibold text-on-surface">No tasks for today</p>
            <p className="font-body text-[11px] text-on-surface-variant max-w-xs">
              Enjoy peaceful mindful breathing or add an action item.
            </p>
            <button
              onClick={() => {
                setModalType('todo');
                setIsModalOpen(true);
              }}
              className="mt-1 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Add Task</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {dashboardTodos.map(todo => {
              const isChecked = Boolean(todo.is_completed);
              const isBusy = actionLoading[`todo_${todo.id}`];

              return (
                <div
                  key={todo.id}
                  className={`bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-outline-variant/20 flex items-center gap-3 hover:shadow-md transition-all ${
                    isChecked ? 'opacity-70' : ''
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`Toggle task completion: ${todo.title}`}
                    disabled={isBusy}
                    onClick={() => handleToggleTodo(todo)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isChecked
                        ? 'bg-primary text-on-primary'
                        : 'border-2 border-outline-variant hover:border-primary text-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">check</span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-headline text-xs font-bold text-on-surface truncate ${
                          isChecked ? 'line-through text-on-surface-variant' : ''
                        }`}
                      >
                        {todo.title}
                      </span>
                      {getPriorityBadge(todo.priority)}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-on-surface-variant">
                      {todo.recurrence !== 'one_time' && (
                        <span className="inline-flex items-center gap-0.5 text-primary font-semibold">
                          <span className="material-symbols-outlined text-[12px]">repeat</span>
                          <span>{todo.recurrence}</span>
                        </span>
                      )}
                      {todo.due_date && <span>Due: {todo.due_date}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Access: Focus Timer & Daily Journal (2-column) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
        {/* Focus Timer Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">timer</span>
                <h3 className="font-headline text-xs font-bold text-on-surface">Focus Timer</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                Deep Flow
              </span>
            </div>
            <p className="font-body text-[11px] text-on-surface-variant mt-1">
              Sessions logged upon natural completion.
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-extrabold text-secondary leading-tight">
                {timerStats.total_sessions}
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                {timerStats.total_sessions === 1 ? 'session' : 'sessions'} ({timerStats.total_minutes}m)
              </span>
            </div>
          </div>
          <Link
            to="/timer"
            className="w-full text-center py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
          >
            Start Focus Session
          </Link>
        </div>

        {/* Daily Journal Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">menu_book</span>
                <h3 className="font-headline text-xs font-bold text-on-surface">Daily Journal</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-medium">
                Reflection
              </span>
            </div>
            <p className="font-body text-[11px] text-on-surface-variant mt-1">
              Capture gratitude, progress notes, and thoughts.
            </p>
            <p className="text-xs text-on-surface-variant italic mt-3 truncate">
              "What went well today?"
            </p>
          </div>
          <Link
            to="/journal"
            className="w-full text-center py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
          >
            Open Journal
          </Link>
        </div>
      </section>

      {/* Quick Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-xl border border-outline-variant/30 w-full max-w-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-base font-bold text-on-surface">Quick Add</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="grid grid-cols-2 p-1 bg-surface-container rounded-full text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalType('habit')}
                className={`py-1.5 rounded-full transition-all ${
                  modalType === 'habit'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant'
                }`}
              >
                Habit
              </button>
              <button
                type="button"
                onClick={() => setModalType('todo')}
                className={`py-1.5 rounded-full transition-all ${
                  modalType === 'todo'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant'
                }`}
              >
                Task
              </button>
            </div>

            {formError && (
              <div className="p-2 rounded-lg bg-error-container text-on-error-container text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleQuickAddSubmit} className="flex flex-col gap-3">
              {modalType === 'habit' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      Habit Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Read 20 pages"
                      value={habitForm.name}
                      onChange={e => setHabitForm({ ...habitForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      Frequency
                    </label>
                    <select
                      value={habitForm.target_frequency}
                      onChange={e => setHabitForm({ ...habitForm, target_frequency: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                    >
                      <option value="daily">Daily</option>
                      <option value="3x_week">3x / week</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Submit quarterly report"
                      value={todoForm.title}
                      onChange={e => setTodoForm({ ...todoForm, title: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                        Priority
                      </label>
                      <select
                        value={todoForm.priority}
                        onChange={e => setTodoForm({ ...todoForm, priority: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                        Recurrence
                      </label>
                      <select
                        value={todoForm.recurrence}
                        onChange={e => setTodoForm({ ...todoForm, recurrence: e.target.value })}
                        className="w-full px-2.5 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                      >
                        <option value="one_time">One-time</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm active:scale-95 transition-all"
                >
                  {formSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
