import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

export default function TodoFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [recurrence, setRecurrence] = useState('one_time');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit) {
      fetchTodo();
    }
  }, [id]);

  async function fetchTodo() {
    try {
      const res = await fetch(`/api/todos/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load task');
      const data = await res.json();
      setTitle(data.title || '');
      setDueDate(data.due_date || '');
      setPriority(data.priority || 'medium');
      setRecurrence(data.recurrence || 'one_time');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a task title.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = isEdit ? `/api/todos/${id}` : '/api/todos';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          due_date: dueDate || null,
          priority,
          recurrence
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save task');
      }

      navigate('/todos');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col w-full max-w-[480px] mx-auto pb-12">
      {/* Top Action Sub-bar */}
      <div className="flex items-center justify-between py-2 mb-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
          <span className="material-symbols-outlined text-[16px]">task_alt</span>
          <span>{isEdit ? 'Edit Task' : 'New Task'}</span>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Inspirational Micro-card */}
      <div className="relative overflow-hidden rounded-lg bg-surface-container-low p-4 mb-5 shadow-sm">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[22px]">checklist</span>
          </div>
          <div className="min-w-0">
            <p className="font-label-md text-xs font-bold text-secondary">Intentional Action</p>
            <p className="font-body-md text-xs text-on-surface-variant truncate">
              Clear goals set a calm, productive rhythm for your day.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-error-container text-on-error-container rounded-2xl text-xs font-medium mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-error">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Form Surface */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Task Title Input */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-lg text-xs font-bold text-on-surface px-1 flex items-center justify-between">
            <span>Task Title</span>
            <span className="text-[11px] text-tertiary font-normal">Required</span>
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">
              edit
            </span>
            <input
              type="text"
              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-sm placeholder:text-outline-variant rounded-full pl-12 pr-5 py-3 shadow-sm outline-none focus:bg-surface-container-low transition-all"
              placeholder="e.g. Call accountant, Review PRD"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Priority Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-lg text-xs font-bold text-on-surface px-1">Priority Level</label>
          <div className="p-1 rounded-full bg-surface-container-low flex items-center justify-between gap-1 shadow-inner">
            {[
              { val: 'low', label: 'Low', color: 'bg-primary text-on-primary' },
              { val: 'medium', label: 'Medium', color: 'bg-secondary text-on-secondary' },
              { val: 'high', label: 'High', color: 'bg-error text-on-error' },
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => setPriority(item.val)}
                className={`flex-1 py-2 rounded-full font-label-md text-xs font-semibold text-center transition-all ${
                  priority === item.val
                    ? `${item.color} shadow-sm`
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recurrence Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-lg text-xs font-bold text-on-surface px-1">Recurrence Schedule</label>
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-full bg-surface-container-low text-center shadow-inner">
            {[
              { val: 'one_time', label: 'Once' },
              { val: 'daily', label: 'Daily' },
              { val: 'weekly', label: 'Weekly' },
              { val: 'monthly', label: 'Monthly' },
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => setRecurrence(item.val)}
                className={`py-2 rounded-full font-label-md text-xs font-semibold transition-all ${
                  recurrence === item.val
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-lg text-xs font-bold text-on-surface px-1">Due Date (Optional)</label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">
              calendar_today
            </span>
            <input
              type="date"
              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-sm rounded-full pl-12 pr-5 py-3 shadow-sm outline-none focus:bg-surface-container-low transition-all"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 rounded-full bg-surface-container text-on-surface font-label-lg text-sm font-semibold hover:bg-surface-container-high transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[1.5] py-3 rounded-full bg-primary text-on-primary font-label-lg text-sm font-semibold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>{loading ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}</span>
            <span className="material-symbols-outlined text-[18px]">check</span>
          </button>
        </div>
      </form>
    </div>
  );
}
