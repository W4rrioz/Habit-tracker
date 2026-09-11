import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingKeys, setTogglingKeys] = useState({});

  useEffect(() => {
    fetchHabits();
  }, []);

  async function fetchHabits() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/habits', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load habits.');
      const data = await res.json();
      setHabits(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleCheckin(habitId, date) {
    const toggleKey = `${habitId}-${date}`;
    if (togglingKeys[toggleKey]) return;

    setTogglingKeys((prev) => ({ ...prev, [toggleKey]: true }));
    setHabits((prevHabits) =>
      prevHabits.map((h) => {
        if (h.id !== habitId) return h;
        const updated7Days = (h.last_7_days || []).map((d) => {
          if (d.date === date) {
            return { ...d, completed: !d.completed };
          }
          return d;
        });
        return {
          ...h,
          last_7_days: updated7Days,
        };
      })
    );

    try {
      const res = await fetch(`/api/habits/${habitId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date }),
      });
      if (res.ok) {
        const result = await res.json();
        setHabits((prevHabits) =>
          prevHabits.map((h) => {
            if (h.id !== habitId) return h;
            return {
              ...h,
              current_streak: result.current_streak,
              longest_streak: result.longest_streak,
              total_checkins: result.total_checkins,
              is_completed_today: result.is_completed_today,
            };
          })
        );
      } else {
        await fetchHabits();
      }
    } catch (err) {
      console.error(err);
      await fetchHabits();
    } finally {
      setTogglingKeys((prev) => ({ ...prev, [toggleKey]: false }));
    }
  }

  async function handleArchive(id) {
    if (!window.confirm('Archive this habit?')) return;
    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to archive habit');
      await fetchHabits();
    } catch (err) {
      alert(err.message);
    }
  }

  const getMilestoneBadge = (streak) => {
    if (streak >= 100) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
          💯 100 Days
        </span>
      );
    }
    if (streak >= 30) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
          🌟 30 Days
        </span>
      );
    }
    if (streak >= 7) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
          ⚡ 7 Days
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full max-w-[560px] mx-auto pb-12">
      {/* Top Action & Title Bar */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            My Habits
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>
            <span>Consistency builds lasting peace & flow</span>
          </p>
        </div>
        <Link
          to="/habits/new"
          className="flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary-container px-4 py-2.5 rounded-full shadow-sm active:scale-95 transition-all font-label-md text-xs font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Habit</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-on-surface-variant font-medium">Loading habits...</div>
      ) : habits.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-4xl text-outline-variant mb-2 block">spa</span>
          <p className="font-headline-sm text-sm font-semibold text-on-surface">No active habits yet</p>
          <p className="font-body-sm text-xs text-on-surface-variant mt-1 mb-4">
            Start small with a daily rhythm like Morning Hydration or Reading.
          </p>
          <Link
            to="/habits/new"
            className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2 rounded-full text-xs font-semibold shadow-sm"
          >
            Create First Habit
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="bg-surface-container-lowest rounded-lg p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 group"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    to={`/habits/${habit.id}`}
                    className="font-headline-sm text-sm font-bold text-on-surface hover:text-primary transition-colors block"
                  >
                    {habit.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-semibold uppercase tracking-wider">
                      {habit.target_frequency || 'Daily'}
                    </span>
                    {getMilestoneBadge(habit.current_streak)}
                  </div>
                </div>

                {/* Streak Badge & Actions */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[15px]">local_fire_department</span>
                    <span>{habit.current_streak}d</span>
                  </div>

                  <Link
                    to={`/habits/${habit.id}/edit`}
                    className="opacity-0 group-hover:opacity-100 text-outline hover:text-primary transition-all p-1"
                    title="Edit Habit"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </Link>
                  <button
                    onClick={() => handleArchive(habit.id)}
                    className="opacity-0 group-hover:opacity-100 text-outline hover:text-error transition-all p-1"
                    title="Archive Habit"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              {/* 7-Day History Grid */}
              <div className="border-t border-outline-variant/15 pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-on-surface-variant">Last 7 Days</span>
                  <Link
                    to={`/habits/${habit.id}`}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    View Stats ➔
                  </Link>
                </div>

                <div className="flex justify-between items-center mt-2">
                  {(habit.last_7_days || []).map((day) => {
                    const isToday = day.is_today;
                    const isDone = day.completed;
                    const toggleKey = `${habit.id}-${day.date}`;
                    return (
                      <div key={day.date} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-medium text-on-surface-variant">{day.day_name}</span>
                        <button
                          onClick={() => handleToggleCheckin(habit.id, day.date)}
                          disabled={togglingKeys[toggleKey]}
                          title={`${day.date}: ${isDone ? 'Completed' : 'Missed'}`}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                            isDone
                              ? 'bg-secondary text-on-secondary shadow-sm'
                              : isToday
                              ? 'border-2 border-dashed border-secondary text-secondary hover:bg-secondary-container/20'
                              : 'bg-surface-container text-transparent hover:bg-surface-container-high'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {isDone ? 'check' : isToday ? 'add' : ''}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
