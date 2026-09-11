import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function HabitFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [focusArea, setFocusArea] = useState('Wellness');
  const [targetFrequency, setTargetFrequency] = useState('daily');
  const [isArchived, setIsArchived] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const focusAreas = [
    { label: 'Wellness', icon: 'water_drop' },
    { label: 'Mind', icon: 'menu_book' },
    { label: 'Body', icon: 'directions_walk' },
    { label: 'Soul', icon: 'self_improvement' }
  ];

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
      if (!res.ok) throw new Error('Could not find habit to edit.');
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save habit');
      }

      navigate('/habits');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col w-full px-4 max-w-[480px] mx-auto pb-12">
      {/* Interactive Top Action Sub-bar */}
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
          <span className="material-symbols-outlined text-[16px]">spark</span>
          <span>{isEditing ? 'Edit Rhythm' : 'New Rhythm'}</span>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Ambient Inspirational Micro-card */}
      <div className="relative overflow-hidden rounded-lg bg-surface-container-low p-4 mb-5 shadow-sm">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[24px]">eco</span>
          </div>
          <div className="min-w-0">
            <p className="font-label-md text-xs font-bold text-secondary">Mindful Routine</p>
            <p className="font-body-md text-xs text-on-surface-variant truncate">
              Small consistent daily steps create lasting calm.
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
        {/* 1. Habit Name Input */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-lg text-xs font-bold text-on-surface px-1 flex items-center justify-between">
            <span>Habit Name</span>
            <span className="text-[11px] text-tertiary font-normal">Required</span>
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">
              edit_note
            </span>
            <input
              type="text"
              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-sm placeholder:text-outline-variant rounded-full pl-12 pr-5 py-3.5 shadow-sm outline-none focus:bg-surface-container-low transition-all"
              placeholder="e.g. Morning Hydration, Read 20 Pages"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Focus Area Pills */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label-lg text-xs font-bold text-on-surface px-1">Focus Area</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {focusAreas.map((area) => (
              <button
                key={area.label}
                type="button"
                onClick={() => setFocusArea(area.label)}
                className={`px-4 py-2 rounded-full font-label-md text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                  focusArea === area.label
                    ? 'bg-secondary text-on-secondary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{area.icon}</span>
                <span>{area.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Target Frequency */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <label className="font-label-lg text-xs font-bold text-on-surface">Target Frequency</label>
            <span className="text-[11px] text-secondary font-medium">Build momentum</span>
          </div>
          <div className="p-1.5 rounded-full bg-surface-container-low flex items-center justify-between gap-1 shadow-inner">
            {[
              { val: 'daily', label: 'Daily' },
              { val: '3x', label: '3x a week' },
              { val: 'weekly', label: 'Weekly' }
            ].map((freq) => (
              <button
                key={freq.val}
                type="button"
                onClick={() => setTargetFrequency(freq.val)}
                className={`flex-1 py-2.5 rounded-full font-label-md text-xs font-semibold text-center transition-all ${
                  targetFrequency === freq.val
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {freq.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Micro Routine Preview */}
        <div className="rounded-lg bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant font-medium">Scheduled Repetitions</span>
            <span className="font-label-sm text-xs text-secondary font-semibold">
              {targetFrequency === 'daily' ? '7 days active' : targetFrequency === '3x' ? '3 days recommended' : '1 day active'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <span
                key={idx}
                className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center ${
                  targetFrequency === 'daily' || (targetFrequency === '3x' && (idx === 0 || idx === 2 || idx === 4)) || (targetFrequency === 'weekly' && idx === 0)
                    ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                    : 'bg-surface-container text-outline'
                }`}
              >
                {day}
              </span>
            ))}
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
            disabled={submitting}
            className="flex-[1.5] py-3 rounded-full bg-primary text-on-primary font-label-lg text-sm font-semibold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>{submitting ? 'Saving...' : isEditing ? 'Update Rhythm' : 'Save Rhythm'}</span>
            <span className="material-symbols-outlined text-[18px]">check</span>
          </button>
        </div>
      </form>
    </div>
  );
}
