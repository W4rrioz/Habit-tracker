import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function HabitFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [targetFrequency, setTargetFrequency] = useState('daily');
  const [isArchived, setIsArchived] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      fetchHabit();
    }
  }, [id]);

  async function fetchHabit() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/habits/${id}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Could not find habit to edit.');
      }
      const data = await res.json();
      const habit = data.habit || data;
      setName(habit.name || '');
      setTargetFrequency(habit.target_frequency || 'daily');
      setIsArchived(Boolean(habit.is_archived));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a habit name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const endpoint = isEditing ? `/api/habits/${id}` : '/api/habits';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        name: name.trim(),
        target_frequency: targetFrequency
      };
      if (isEditing) {
        payload.is_archived = isArchived;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save habit.');
      }

      navigate(isEditing ? `/habits/${id}` : '/habits');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Archive this habit? It will be removed from your active daily list.')) {
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/habits/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to archive habit.');
      }
      navigate('/habits');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '520px', margin: '40px auto', textAlign: 'center' }}>
        <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Loading habit details...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Breadcrumb back link */}
      <div>
        <Link
          to={isEditing ? `/habits/${id}` : '/habits'}
          className="label-sm"
          style={{ color: 'var(--on-surface-variant)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          {isEditing ? 'Back to Habit Details' : 'Back to My Habits'}
        </Link>
      </div>

      <div className="card" style={{ padding: '28px' }}>
        <h1 className="headline-lg" style={{ marginBottom: '4px' }}>
          {isEditing ? 'Edit Habit' : 'Create New Habit'}
        </h1>
        <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
          {isEditing
            ? 'Update your habit parameters or frequency.'
            : 'Set a clear intention and routine to practice regularly.'}
        </p>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--priority-high-bg)',
              color: 'var(--priority-high-text)',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '20px'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Habit Name Field */}
          <div>
            <label className="label-md" style={{ display: 'block', marginBottom: '8px', color: 'var(--on-surface)' }}>
              Habit Name <span style={{ color: 'var(--priority-high)' }}>*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Read 20 pages, Morning meditation, Drink 2L water"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--outline-variant)',
                backgroundColor: 'var(--surface-container-low)',
                color: 'var(--on-surface)',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--outline-variant)')}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <span className="body-sm" style={{ color: 'var(--outline)', fontSize: '11px' }}>
                {name.length}/100
              </span>
            </div>
          </div>

          {/* Target Frequency Field */}
          <div>
            <label className="label-md" style={{ display: 'block', marginBottom: '8px', color: 'var(--on-surface)' }}>
              Target Frequency
            </label>
            <select
              value={targetFrequency}
              onChange={(e) => setTargetFrequency(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--outline-variant)',
                backgroundColor: 'var(--surface-container-low)',
                color: 'var(--on-surface)',
                outline: 'none',
                cursor: 'pointer'
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--outline-variant)')}
            >
              <option value="daily">Daily (7 days a week)</option>
              <option value="3x_week">3 times a week</option>
              <option value="weekly">Weekly (Once a week)</option>
            </select>
          </div>

          {/* Archive Status Toggle (when editing) */}
          {isEditing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--surface-container-high)'
              }}
            >
              <div>
                <span className="label-md" style={{ display: 'block' }}>Archived Status</span>
                <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  Archived habits are hidden from the active daily list.
                </span>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={isArchived}
                  onChange={(e) => setIsArchived(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <span className="label-sm">{isArchived ? 'Archived' : 'Active'}</span>
              </label>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="btn-primary"
              style={{ flex: 1, opacity: submitting ? 0.7 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {isEditing ? 'check' : 'add'}
              </span>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Habit'}
            </button>
            <button
              type="button"
              onClick={() => navigate(isEditing ? `/habits/${id}` : '/habits')}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
          </div>

          {/* Archive button on edit */}
          {isEditing && (
            <div style={{ borderTop: '1px solid var(--surface-container-high)', paddingTop: '16px', marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleDelete}
                className="btn-secondary"
                style={{ color: 'var(--priority-high)', borderColor: 'var(--priority-high-bg)', fontSize: '13px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>archive</span>
                Archive Habit
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
