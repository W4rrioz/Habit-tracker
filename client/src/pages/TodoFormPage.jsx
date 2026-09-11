import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function TodoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [recurrence, setRecurrence] = useState('one_time');

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      fetchTodo();
    }
  }, [id]);

  async function fetchTodo() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/todos/${id}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Could not find requested task');
      }
      const data = await res.json();
      if (data.todo) {
        setTitle(data.todo.title || '');
        setDueDate(data.todo.due_date || '');
        setPriority(data.todo.priority || 'medium');
        setRecurrence(data.todo.recurrence || 'one_time');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        title: title.trim(),
        due_date: dueDate || null,
        priority,
        recurrence
      };

      const url = isEditing ? `/api/todos/${id}` : '/api/todos';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save task');
      }

      navigate('/todos');
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const priorityOptions = [
    { value: 'low', label: 'Low', bg: 'var(--priority-low-bg)', text: 'var(--priority-low-text)', border: '#93ccff' },
    { value: 'medium', label: 'Medium', bg: 'var(--priority-med-bg)', text: 'var(--priority-med-text)', border: '#fde68a' },
    { value: 'high', label: 'High', bg: 'var(--priority-high-bg)', text: 'var(--priority-high-text)', border: '#ffdad6' }
  ];

  const recurrenceOptions = [
    { value: 'one_time', label: 'One-time', desc: 'Single task with optional due date' },
    { value: 'daily', label: 'Daily', desc: 'Resets daily; missed tasks become leftovers next day' },
    { value: 'weekly', label: 'Weekly', desc: 'Resets every Monday; missed tasks become leftovers' },
    { value: 'monthly', label: 'Monthly', desc: 'Resets 1st of each month; tracks monthly leftover' }
  ];

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto', padding: '12px 0 32px' }}>
      <div className="card">
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 className="headline-lg" style={{ marginBottom: '6px' }}>
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </h1>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
            {isEditing
              ? 'Update details, priority, or recurrence rules.'
              : 'Add a new task to your calm progress system.'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--error-container)',
              color: 'var(--on-error-container)',
              marginBottom: '20px',
              fontSize: '14px'
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <p className="body-md" style={{ color: 'var(--on-surface-variant)', textAlign: 'center', padding: '24px' }}>
            Loading task details...
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Title */}
            <div>
              <label className="label-md" style={{ display: 'block', marginBottom: '8px', color: 'var(--on-surface)' }}>
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekly grocery planning"
                className="form-input"
                required
                autoFocus
              />
            </div>

            {/* Priority Selector */}
            <div>
              <label className="label-md" style={{ display: 'block', marginBottom: '8px', color: 'var(--on-surface)' }}>
                Priority Level
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {priorityOptions.map((opt) => {
                  const isSelected = priority === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--surface-container-high)'}`,
                        backgroundColor: isSelected ? opt.bg : 'var(--surface-container-lowest)',
                        color: isSelected ? opt.text : 'var(--on-surface-variant)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: opt.border
                        }}
                      />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recurrence Selector */}
            <div>
              <label className="label-md" style={{ display: 'block', marginBottom: '8px', color: 'var(--on-surface)' }}>
                Recurrence & Leftover Tracking
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {recurrenceOptions.map((opt) => {
                  const isSelected = recurrence === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setRecurrence(opt.value)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--surface-container-high)'}`,
                        backgroundColor: isSelected ? 'var(--surface-container-low)' : 'var(--surface-container-lowest)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="recurrence"
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => setRecurrence(opt.value)}
                        style={{ marginTop: '3px', accentColor: 'var(--primary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <p className="label-md" style={{ color: isSelected ? 'var(--primary)' : 'var(--on-surface)', marginBottom: '2px' }}>
                          {opt.label}
                        </p>
                        <p className="body-sm" style={{ color: 'var(--on-surface-variant)', margin: 0 }}>
                          {opt.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="label-md" style={{ display: 'block', marginBottom: '8px', color: 'var(--on-surface)' }}>
                Due Date {recurrence !== 'one_time' ? '(Optional Reference)' : '(Optional)'}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="form-input"
              />
              <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                {recurrence === 'one_time'
                  ? 'Tasks with future due dates will appear in the "Upcoming" tab.'
                  : 'Recurring tasks cycle automatically based on the selected frequency.'}
              </p>
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ flex: 1 }}
              >
                {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
