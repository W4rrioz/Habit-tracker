import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function TodosPage() {
  const [tab, setTab] = useState('today');
  const [data, setData] = useState({ today: [], upcoming: [], completed: [], leftovers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchTodos();
  }, []);

  async function fetchTodos() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/todos', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load tasks');
      const json = await res.json();
      setData({
        today: json.today || [],
        upcoming: json.upcoming || [],
        completed: json.completed || [],
        leftovers: json.leftovers || []
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(todo, isLeftover = false) {
    const key = `${todo.id}_${isLeftover ? 'leftover' : 'normal'}`;
    if (actionLoading[key]) return;

    try {
      setActionLoading(prev => ({ ...prev, [key]: true }));
      const payload = isLeftover && todo.leftover_period_start
        ? { period_start: todo.leftover_period_start }
        : {};

      const res = await fetch(`/api/todos/${todo.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update task');
      await fetchTodos();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete task');
      await fetchTodos();
    } catch (err) {
      alert(err.message);
    }
  }

  const priorityBadge = (priority) => {
    if (priority === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[11px] font-semibold shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-error"></span> High
        </span>
      );
    }
    if (priority === 'medium') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-semibold shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Low
      </span>
    );
  };

  const totalTodayTasks = data.today.length + (data.completed.filter(t => t.completed_today || t.is_completed).length);
  const completedTodayCount = data.completed.length;
  const progressPercent = totalTodayTasks > 0
    ? Math.round((completedTodayCount / (data.today.length + completedTodayCount)) * 100)
    : 0;

  const currentList = tab === 'today' ? data.today : tab === 'upcoming' ? data.upcoming : data.completed;

  return (
    <div className="flex flex-col w-full max-w-[560px] mx-auto pb-12">
      {/* Top Action & Title Bar */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">Todos</h1>
          <p className="font-body-sm text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>
            <span>{data.today.length} pending • {completedTodayCount} completed today</span>
          </p>
        </div>
        <Link
          to="/todos/new"
          className="flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary-container px-4 py-2.5 rounded-full shadow-sm active:scale-95 transition-all duration-200 font-label-md text-xs font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Task</span>
        </Link>
      </div>

      {/* Micro Focus Banner (Calm Progress Moment) */}
      <div className="relative overflow-hidden rounded-lg bg-surface-container-low p-4 mb-4 flex items-center gap-3.5 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-[20px]">spa</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-label-sm text-[11px] font-bold text-secondary uppercase tracking-wider">
              Mindful Momentum
            </span>
            <span className="font-label-sm text-xs font-semibold text-on-surface-variant">
              {progressPercent}% done
            </span>
          </div>
          <p className="font-body-sm text-xs text-on-surface truncate mt-0.5">
            {progressPercent === 100
              ? 'All daily tasks complete! Take a deep breath and rest.'
              : 'One mindful step at a time. Keep going.'}
          </p>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Leftover Tasks Banner */}
      {data.leftovers.length > 0 && tab === 'today' && (
        <div className="mb-4 p-4 rounded-lg bg-error-container/40 border border-error-container text-on-error-container shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-label-md text-xs font-bold text-error">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span>Leftover Tasks From Previous Periods</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-error-container font-semibold">
              {data.leftovers.length} overdue
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {data.leftovers.map((item) => (
              <div
                key={`leftover_${item.id}`}
                className="flex items-center justify-between gap-2 bg-surface-container-lowest p-2.5 rounded-md shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-body-md text-xs font-semibold text-on-surface truncate">{item.title}</p>
                  <p className="font-body-sm text-[10px] text-error font-medium">
                    Unfinished from {item.leftover_period_name || 'yesterday'}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(item, true)}
                  disabled={actionLoading[`${item.id}_leftover`]}
                  className="px-3 py-1 rounded-full bg-secondary text-on-secondary text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shrink-0"
                >
                  Mark Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Soft Rounded Tab Switcher */}
      <div className="flex items-center bg-surface-container-low p-1 rounded-full mb-4 shadow-sm">
        <button
          onClick={() => setTab('today')}
          className={`tab-pill flex-1 py-2 px-2 rounded-full font-label-md text-xs font-semibold text-center transition-all duration-200 ${
            tab === 'today'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Today
          <span className="inline-flex items-center justify-center ml-1.5 w-4 h-4 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold">
            {data.today.length}
          </span>
        </button>
        <button
          onClick={() => setTab('upcoming')}
          className={`tab-pill flex-1 py-2 px-2 rounded-full font-label-md text-xs font-semibold text-center transition-all duration-200 ${
            tab === 'upcoming'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Upcoming
          <span className="inline-flex items-center justify-center ml-1.5 w-4 h-4 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] font-bold">
            {data.upcoming.length}
          </span>
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`tab-pill flex-1 py-2 px-2 rounded-full font-label-md text-xs font-semibold text-center transition-all duration-200 ${
            tab === 'completed'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Completed
          <span className="inline-flex items-center justify-center ml-1.5 w-4 h-4 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] font-bold">
            {data.completed.length}
          </span>
        </button>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-on-surface-variant font-medium">Loading tasks...</div>
      ) : currentList.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-4xl text-outline-variant mb-2 block">task_alt</span>
          <p className="font-headline-sm text-sm font-semibold text-on-surface">No tasks in this list</p>
          <p className="font-body-sm text-xs text-on-surface-variant mt-1">Enjoy the calm or add a new task.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {currentList.map((todo) => {
            const isDone = todo.is_completed || todo.completed_today;
            return (
              <div
                key={todo.id}
                className="task-card group relative flex items-start gap-3 p-3.5 bg-surface-container-lowest rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Circular Checkbox */}
                <button
                  aria-label="Mark task complete"
                  onClick={() => handleToggle(todo)}
                  disabled={actionLoading[`${todo.id}_normal`]}
                  className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-90 ${
                    isDone
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container hover:bg-surface-container-high text-transparent hover:text-outline'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`task-title font-body-lg text-sm font-semibold leading-snug select-none ${
                        isDone ? 'line-through text-on-surface-variant/60' : 'text-on-surface'
                      }`}
                    >
                      {todo.title}
                    </h3>
                    {priorityBadge(todo.priority)}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-on-surface-variant">
                    {todo.due_date && (
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        <span>{todo.due_date}</span>
                      </span>
                    )}
                    {todo.recurrence && todo.recurrence !== 'one_time' && (
                      <span className="inline-flex items-center gap-1 capitalize text-secondary font-medium">
                        <span className="material-symbols-outlined text-[14px]">repeat</span>
                        <span>{todo.recurrence}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(todo.id)}
                  title="Delete Task"
                  className="opacity-0 group-hover:opacity-100 text-outline hover:text-error transition-all p-1 rounded-full hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
