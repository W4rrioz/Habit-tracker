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
      // Revert on error
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

      // Refresh todos from server for accurate sorting & recurrence status
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

      // Re-fetch todos to clear from leftovers
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

  // --- Today's Todos Aggregation (combining active/pending with one-time tasks completed today) ---
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

  function getPriorityBadge(priority) {
    switch (priority) {
      case 'high':
        return <span className="badge badge-priority-high">High</span>;
      case 'low':
        return <span className="badge badge-priority-low">Low</span>;
      case 'medium':
      default:
        return <span className="badge badge-priority-med">Medium</span>;
    }
  }

  function getFrequencyLabel(freq) {
    switch (freq) {
      case 'daily':
        return 'Daily';
      case '3x_week':
        return '3x / week';
      case 'weekly':
        return 'Weekly';
      default:
        return freq;
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container" style={{ padding: '40px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>
            progress_activity
          </span>
          <span className="body-md" style={{ fontWeight: '600' }}>Loading today's dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container" style={{ padding: '24px 0' }}>
        <div className="card" style={{ borderColor: 'var(--error-container)', backgroundColor: 'var(--surface-container-low)', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--error)', marginBottom: '8px' }}>
            error_outline
          </span>
          <h2 className="headline-sm" style={{ color: 'var(--error)', marginBottom: '8px' }}>Could not load dashboard</h2>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>{error}</p>
          <button onClick={loadDashboardData} className="btn-primary">
            <span className="material-symbols-outlined">refresh</span>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Top Header & Actions (No weather widget or user avatar photo) */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <div className="dashboard-date-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_today</span>
            <span>{formatDisplayDate()}</span>
          </div>
          <h1 className="headline-lg" style={{ color: 'var(--on-surface)', marginTop: '4px' }}>
            Daily Dashboard
          </h1>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
            One calm view for today's habits, tasks, and reflections.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setModalType('habit');
              setIsModalOpen(true);
            }}
            className="btn-secondary"
            title="Quick Add Habit or Task"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Quick Add
          </button>
          <Link to="/habits" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
            Habits
          </Link>
          <Link to="/todos" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>format_list_bulleted</span>
            Todos
          </Link>
        </div>
      </div>

      {/* Overall Daily Progress Bar */}
      <div className="daily-progress-card">
        <div className="daily-progress-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--secondary-container)',
                color: 'var(--on-secondary-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>spa</span>
            </div>
            <div>
              <span className="label-sm" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Mindful Momentum
              </span>
              <h2 className="headline-sm" style={{ color: 'var(--on-surface)', margin: 0 }}>
                Today's Progress
              </h2>
            </div>
          </div>
          <div className="daily-progress-stats">
            <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--secondary)' }}>
              {progressPercent}%
            </span>
            <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>
              ({totalDone}/{totalItems})
            </span>
          </div>
        </div>

        <p className="body-sm" style={{ color: 'var(--on-surface)' }}>
          {getProgressMessage()}
        </p>

        {/* Progress Track & Fill */}
        <div className="daily-progress-bar-track">
          <div
            className="daily-progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="daily-progress-breakdown">
          <span>
            <strong>Habits:</strong> {habitsDone} of {habitsTotal} checked
          </span>
          <span>•</span>
          <span>
            <strong>Todos:</strong> {todosDone} of {todosTotal} completed
          </span>
          {todosData.leftovers.length > 0 && (
            <>
              <span>•</span>
              <span style={{ color: '#b45309', fontWeight: '600' }}>
                {todosData.leftovers.length} leftover {todosData.leftovers.length === 1 ? 'task' : 'tasks'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Leftovers Section */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="headline-sm" style={{ color: 'var(--on-surface)' }}>Leftovers</h2>
            {todosData.leftovers.length > 0 ? (
              <span className="badge badge-priority-med">
                {todosData.leftovers.length} pending
              </span>
            ) : (
              <span className="badge badge-streak" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                All Clear
              </span>
            )}
          </div>
        </div>

        {todosData.leftovers.length > 0 ? (
          <div className="leftover-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>warning</span>
              <span className="label-md" style={{ fontWeight: '700' }}>
                Recurring tasks missed from previous periods
              </span>
            </div>
            <p className="body-sm" style={{ color: '#78350f' }}>
              These recurring tasks ended without being checked off. Complete them now to keep your records consistent.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {todosData.leftovers.map(item => {
                const actionKey = `leftover_${item.id}_${item.leftover_period_start}`;
                const isSubmitting = actionLoading[actionKey];

                return (
                  <div key={`${item.id}-${item.leftover_period_start}`} className="leftover-item">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="body-md" style={{ fontWeight: '600', color: 'var(--on-surface)' }}>
                          {item.title}
                        </span>
                        {getPriorityBadge(item.priority)}
                      </div>
                      <span className="label-sm" style={{ color: '#b45309' }}>
                        {item.recurrence.toUpperCase()} • Period started {item.leftover_period_start}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-complete-leftover"
                      disabled={isSubmitting}
                      onClick={() => handleCompleteLeftover(item)}
                      title="Mark leftover as completed"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                      {isSubmitting ? 'Saving...' : 'Complete'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="leftover-banner-positive">
            <span
              className="material-symbols-outlined"
              style={{ color: 'var(--secondary)', fontSize: '20px' }}
            >
              check_circle
            </span>
            <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
              All caught up! No unfinished recurring items from previous periods.
            </span>
          </div>
        )}
      </section>

      {/* Today's Habits Section */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="headline-sm" style={{ color: 'var(--on-surface)' }}>Today's Habits</h2>
            <span className="badge badge-streak">
              {habitsDone} / {habitsTotal} checked
            </span>
          </div>
          <Link to="/habits" className="label-sm" style={{ color: 'var(--primary)', fontWeight: '600' }}>
            Manage Habits →
          </Link>
        </div>

        {habits.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--outline)', marginBottom: '8px' }}>
              self_improvement
            </span>
            <h3 className="headline-sm" style={{ marginBottom: '4px' }}>No habits yet</h3>
            <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
              Build consistency by adding your first daily or weekly habit.
            </p>
            <button
              onClick={() => {
                setModalType('habit');
                setIsModalOpen(true);
              }}
              className="btn-primary"
            >
              <span className="material-symbols-outlined">add</span>
              Add Your First Habit
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {habits.map(habit => {
              const isChecked = Boolean(habit.is_completed_today);
              const isBusy = actionLoading[`habit_${habit.id}`];

              return (
                <div
                  key={habit.id}
                  className={`dashboard-habit-item ${isChecked ? 'checked' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    {/* One-tap check-in toggle button (min 44x44px circular tap target) */}
                    <button
                      type="button"
                      aria-label={`Check-in ${habit.name}`}
                      disabled={isBusy}
                      onClick={() => handleToggleHabit(habit)}
                      className={`dashboard-habit-btn ${isChecked ? 'checked' : ''}`}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '22px',
                          color: isChecked ? '#ffffff' : 'transparent',
                          fontWeight: '700'
                        }}
                      >
                        check
                      </span>
                    </button>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Link
                          to={`/habits/${habit.id}`}
                          className="body-lg"
                          style={{
                            fontWeight: '600',
                            color: 'var(--on-surface)',
                            textDecoration: isChecked ? 'none' : 'none'
                          }}
                        >
                          {habit.name}
                        </Link>
                        <span className="label-sm" style={{ color: 'var(--on-surface-variant)', backgroundColor: 'var(--surface-container)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                          {getFrequencyLabel(habit.target_frequency)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        {/* Streak Badge */}
                        <span className="streak-pill">
                          <span className="material-symbols-outlined">local_fire_department</span>
                          {habit.current_streak || 0} day{(habit.current_streak === 1 ? '' : 's')} streak
                        </span>
                        {(habit.current_streak || 0) >= 100 && (
                          <span className="badge-milestone badge-milestone-100" title="100-day milestone reached!">
                            💯 100 Days!
                          </span>
                        )}
                        {(habit.current_streak || 0) >= 30 && (habit.current_streak || 0) < 100 && (
                          <span className="badge-milestone badge-milestone-30" title="30-day milestone reached!">
                            🌟 30 Days!
                          </span>
                        )}
                        {(habit.current_streak || 0) >= 7 && (habit.current_streak || 0) < 30 && (
                          <span className="badge-milestone badge-milestone-7" title="7-day milestone reached!">
                            ⚡ 7 Days!
                          </span>
                        )}
                        {habit.longest_streak > (habit.current_streak || 0) && (
                          <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                            (best: {habit.longest_streak}d)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                      to={`/habits/${habit.id}`}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Today's Todos Section */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="headline-sm" style={{ color: 'var(--on-surface)' }}>Today's Todos</h2>
            <span className="badge badge-priority-low">
              {todosTotal - todosDone} pending • {todosDone} done
            </span>
          </div>
          <Link to="/todos" className="label-sm" style={{ color: 'var(--primary)', fontWeight: '600' }}>
            View All Todos →
          </Link>
        </div>

        {dashboardTodos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--outline)', marginBottom: '8px' }}>
              task_alt
            </span>
            <h3 className="headline-sm" style={{ marginBottom: '4px' }}>No tasks scheduled for today</h3>
            <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
              Enjoy your mindful breathing or add a new action item to focus on.
            </p>
            <button
              onClick={() => {
                setModalType('todo');
                setIsModalOpen(true);
              }}
              className="btn-primary"
            >
              <span className="material-symbols-outlined">add</span>
              Add a Task
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dashboardTodos.map(todo => {
              const isChecked = Boolean(todo.is_completed);
              const isBusy = actionLoading[`todo_${todo.id}`];

              return (
                <div
                  key={todo.id}
                  className={`dashboard-todo-item ${isChecked ? 'completed' : ''}`}
                >
                  {/* Circular completion checkbox */}
                  <button
                    type="button"
                    aria-label={`Toggle task completion: ${todo.title}`}
                    disabled={isBusy}
                    onClick={() => handleToggleTodo(todo)}
                    className={`todo-checkbox ${isChecked ? 'checked' : ''}`}
                  >
                    {isChecked && (
                      <span className="material-symbols-outlined">check</span>
                    )}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="dashboard-todo-title body-md" style={{ fontWeight: '600' }}>
                        {todo.title}
                      </span>
                      {getPriorityBadge(todo.priority)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px' }}>
                      {todo.recurrence !== 'one_time' && (
                        <span className="label-sm" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>repeat</span>
                          {todo.recurrence}
                        </span>
                      )}
                      {todo.due_date && (
                        <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                          Due: {todo.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Focus Timer & Journal Quick Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '8px' }}>
        {/* Focus Timer Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>timer</span>
                <h3 className="headline-sm">Focus Timer</h3>
              </div>
              <span className="badge badge-streak">Deep Flow</span>
            </div>
            <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Completed sessions logged naturally today.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '32px', fontWeight: '700', color: 'var(--secondary)' }}>
                {timerStats.total_sessions}
              </span>
              <span className="label-md" style={{ color: 'var(--on-surface-variant)' }}>
                {timerStats.total_sessions === 1 ? 'session' : 'sessions'} ({timerStats.total_minutes}m total)
              </span>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <Link to="/timer" className="btn-secondary" style={{ width: '100%' }}>
              Start Focus Session
            </Link>
          </div>
        </div>

        {/* Daily Journal Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>menu_book</span>
                <h3 className="headline-sm">Daily Journal</h3>
              </div>
              <span className="badge badge-priority-low">Reflection</span>
            </div>
            <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Record mindful thoughts, gratitude, and evening notes.
            </p>
            <div style={{ marginTop: '16px', color: 'var(--on-surface-variant)', fontSize: '13px' }}>
              Take a quiet moment to reflect on your daily progress and intentions.
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <Link to="/journal" className="btn-primary" style={{ width: '100%' }}>
              Write Today's Entry
            </Link>
          </div>
        </div>
      </section>

      {/* Floating Action Button for Quick Add */}
      <button
        type="button"
        className="dashboard-fab"
        aria-label="Quick Add Habit or Task"
        title="Quick Add Habit or Task"
        onClick={() => {
          setModalType('habit');
          setIsModalOpen(true);
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>add</span>
      </button>

      {/* Quick Add Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="headline-sm" style={{ margin: 0 }}>Quick Add</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--on-surface-variant)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Type Switcher Tabs */}
            <div className="modal-type-tabs">
              <button
                type="button"
                className={`modal-type-tab ${modalType === 'habit' ? 'active' : ''}`}
                onClick={() => {
                  setModalType('habit');
                  setFormError(null);
                }}
              >
                New Habit
              </button>
              <button
                type="button"
                className={`modal-type-tab ${modalType === 'todo' ? 'active' : ''}`}
                onClick={() => {
                  setModalType('todo');
                  setFormError(null);
                }}
              >
                New Task
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--error-container)', color: 'var(--on-error-container)', fontSize: '13px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleQuickAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalType === 'habit' ? (
                <>
                  <div>
                    <label className="label-sm" style={{ display: 'block', marginBottom: '6px', color: 'var(--on-surface-variant)' }}>
                      Habit Name *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Morning Meditation, Drink 2L Water"
                      value={habitForm.name}
                      onChange={e => setHabitForm({ ...habitForm, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="label-sm" style={{ display: 'block', marginBottom: '6px', color: 'var(--on-surface-variant)' }}>
                      Target Frequency
                    </label>
                    <select
                      className="form-select"
                      value={habitForm.target_frequency}
                      onChange={e => setHabitForm({ ...habitForm, target_frequency: e.target.value })}
                    >
                      <option value="daily">Daily</option>
                      <option value="3x_week">3 times / week</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="label-sm" style={{ display: 'block', marginBottom: '6px', color: 'var(--on-surface-variant)' }}>
                      Task Title *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Pay electricity bill, Review document"
                      value={todoForm.title}
                      onChange={e => setTodoForm({ ...todoForm, title: e.target.value })}
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="label-sm" style={{ display: 'block', marginBottom: '6px', color: 'var(--on-surface-variant)' }}>
                        Priority
                      </label>
                      <select
                        className="form-select"
                        value={todoForm.priority}
                        onChange={e => setTodoForm({ ...todoForm, priority: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="label-sm" style={{ display: 'block', marginBottom: '6px', color: 'var(--on-surface-variant)' }}>
                        Recurrence
                      </label>
                      <select
                        className="form-select"
                        value={todoForm.recurrence}
                        onChange={e => setTodoForm({ ...todoForm, recurrence: e.target.value })}
                      >
                        <option value="one_time">One-time</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label-sm" style={{ display: 'block', marginBottom: '6px', color: 'var(--on-surface-variant)' }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={todoForm.due_date}
                      onChange={e => setTodoForm({ ...todoForm, due_date: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : modalType === 'habit' ? 'Create Habit' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

