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
      if (!res.ok) {
        throw new Error('Failed to load tasks');
      }
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

      if (!res.ok) {
        throw new Error('Failed to update task');
      }

      await fetchTodos();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  }

  async function handleDelete(todo) {
    if (!window.confirm(`Delete "${todo.title}"?`)) return;

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to delete task');
      }

      await fetchTodos();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
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

  function getRecurrenceLabel(rec) {
    switch (rec) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly (Mon-Sun)';
      case 'monthly':
        return 'Monthly';
      default:
        return null;
    }
  }

  function getLeftoverPeriodLabel(rec, periodStart) {
    switch (rec) {
      case 'daily':
        return `Yesterday (${periodStart})`;
      case 'weekly':
        return `Last week (started ${periodStart})`;
      case 'monthly':
        return `Last month (${periodStart})`;
      default:
        return periodStart;
    }
  }

  const currentList = data[tab] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="headline-lg">Todo List</h1>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
            Organize one-time tasks, recurring habits, and resolve leftovers calmly.
          </p>
        </div>
        <Link to="/todos/new" className="btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
          Add Todo
        </Link>
      </div>

      {/* Leftover Section/Banner */}
      {data.leftovers.length > 0 ? (
        <div className="leftover-banner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#b45309', fontSize: '22px' }}>
                pending_actions
              </span>
              <span className="label-lg" style={{ color: '#78350f' }}>
                Leftover Tasks ({data.leftovers.length})
              </span>
            </div>
            <span className="body-sm" style={{ color: '#92400e' }}>
              From ended periods
            </span>
          </div>
          <p className="body-sm" style={{ color: '#78350f', margin: 0 }}>
            These recurring tasks were not completed in their previous period. You can check them off now to catch up.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {data.leftovers.map((todo) => {
              const loadingKey = `${todo.id}_leftover`;
              return (
                <div
                  key={`leftover_${todo.id}`}
                  className="todo-card"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#fde68a',
                    padding: '12px 16px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(todo, true)}
                    className="todo-checkbox"
                    disabled={actionLoading[loadingKey]}
                    aria-label={`Mark ${todo.title} completed for leftover period`}
                    title="Mark completed for leftover period"
                  >
                    {actionLoading[loadingKey] && (
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                        sync
                      </span>
                    )}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="body-md" style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                        {todo.title}
                      </span>
                      {getPriorityBadge(todo.priority)}
                      <span
                        className="badge"
                        style={{
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          fontSize: '11px'
                        }}
                      >
                        {getLeftoverPeriodLabel(todo.recurrence, todo.leftover_period_start)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link
                      to={`/todos/${todo.id}/edit`}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      title="Edit Todo"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        tab === 'today' && !loading && (
          <div className="leftover-banner-positive">
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>
              check_circle
            </span>
            <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
              All caught up! No leftover tasks from previous periods.
            </span>
          </div>
        )
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '12px' }}>
        {[
          { id: 'today', label: 'Today', count: data.today.length },
          { id: 'upcoming', label: 'Upcoming', count: data.upcoming.length },
          { id: 'completed', label: 'Completed', count: data.completed.length }
        ].map(({ id, label, count }) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="btn-secondary"
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isActive ? 'var(--primary-fixed)' : 'transparent',
                color: isActive ? 'var(--on-primary-fixed)' : 'var(--on-surface-variant)',
                borderColor: isActive ? 'var(--primary)' : 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: isActive ? 600 : 500
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isActive ? 'var(--primary)' : 'var(--surface-container)',
                  color: isActive ? '#ffffff' : 'var(--on-surface-variant)'
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Loading your tasks...</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--error)', backgroundColor: 'var(--error-container)', padding: '16px' }}>
          <p className="body-md" style={{ color: 'var(--on-error-container)' }}>{error}</p>
        </div>
      )}

      {/* Todo List Content */}
      {!loading && !error && currentList.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--outline)', marginBottom: '8px' }}>
            {tab === 'completed' ? 'task_alt' : 'assignment'}
          </span>
          <p className="headline-sm" style={{ color: 'var(--on-surface)', marginBottom: '4px' }}>
            {tab === 'today' && 'No tasks for today'}
            {tab === 'upcoming' && 'No upcoming tasks scheduled'}
            {tab === 'completed' && 'No completed tasks yet'}
          </p>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
            {tab === 'today' && 'You are completely clear for today. Add a new task to stay organized.'}
            {tab === 'upcoming' && 'Future tasks with due dates will appear here.'}
            {tab === 'completed' && 'Completed tasks and recurring checkoffs will be recorded here.'}
          </p>
          {tab !== 'completed' && (
            <Link to="/todos/new" className="btn-primary" style={{ display: 'inline-flex' }}>
              + Add Todo
            </Link>
          )}
        </div>
      )}

      {!loading && !error && currentList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {currentList.map((todo) => {
            const loadingKey = `${todo.id}_normal`;
            const isDone = Boolean(todo.is_completed);

            return (
              <div
                key={todo.id}
                className={`todo-card ${isDone ? 'completed' : ''}`}
              >
                {/* Circular Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggle(todo, false)}
                  className={`todo-checkbox ${isDone ? 'checked' : ''}`}
                  disabled={actionLoading[loadingKey]}
                  aria-label={isDone ? `Mark "${todo.title}" as incomplete` : `Mark "${todo.title}" as complete`}
                >
                  {actionLoading[loadingKey] ? (
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                      sync
                    </span>
                  ) : isDone ? (
                    <span className="material-symbols-outlined">check</span>
                  ) : null}
                </button>

                {/* Task Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      className="todo-title body-lg"
                      style={{
                        fontWeight: 600,
                        color: isDone ? 'var(--on-surface-variant)' : 'var(--on-surface)',
                        wordBreak: 'break-word'
                      }}
                    >
                      {todo.title}
                    </span>
                    {getPriorityBadge(todo.priority)}
                    {todo.recurrence && todo.recurrence !== 'one_time' && (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'var(--secondary-container)',
                          color: 'var(--on-secondary-container)',
                          fontSize: '11px'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '13px', marginRight: '4px' }}>
                          repeat
                        </span>
                        {getRecurrenceLabel(todo.recurrence)}
                      </span>
                    )}
                  </div>

                  {/* Due Date & Period Metadata */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    {todo.due_date && (
                      <span className="body-sm" style={{ color: 'var(--on-surface-variant)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>event</span>
                        Due: {todo.due_date}
                      </span>
                    )}
                    {todo.recurrence && todo.recurrence !== 'one_time' && (
                      <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                        Current cycle: {todo.current_period_start || 'active'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Edit & Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link
                    to={`/todos/${todo.id}/edit`}
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    title="Edit Todo"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(todo)}
                    className="btn-secondary"
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      color: 'var(--error)'
                    }}
                    title="Delete Todo"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
