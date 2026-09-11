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
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please sign in to view your habits.');
        }
        throw new Error('Failed to load habits.');
      }
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

    // Optimistic UI update
    setTogglingKeys(prev => ({ ...prev, [toggleKey]: true }));
    setHabits(prevHabits =>
      prevHabits.map(h => {
        if (h.id !== habitId) return h;
        const updated7Days = (h.last_7_days || []).map(d => {
          if (d.date === date) {
            return { ...d, completed: !d.completed };
          }
          return d;
        });
        return {
          ...h,
          last_7_days: updated7Days,
          last7Days: updated7Days
        };
      })
    );

    try {
      const res = await fetch(`/api/habits/${habitId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date })
      });

      if (!res.ok) {
        throw new Error('Failed to update check-in.');
      }

      const updated = await res.json();
      // Apply server authoritative streak calculation
      setHabits(prevHabits =>
        prevHabits.map(h => {
          if (h.id !== habitId) return h;
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
            last_7_days: updated.last_7_days || updated.last7Days || h.last_7_days,
            last7Days: updated.last_7_days || updated.last7Days || h.last_7_days
          };
        })
      );
    } catch (err) {
      // Revert to backend state on failure
      fetchHabits();
    } finally {
      setTogglingKeys(prev => {
        const next = { ...prev };
        delete next[toggleKey];
        return next;
      });
    }
  }

  async function handleArchive(habitId) {
    if (!window.confirm('Archive this habit? You can restore it later.')) {
      return;
    }

    try {
      const res = await fetch(`/api/habits/${habitId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to archive habit.');
      }
      setHabits(prev => prev.filter(h => h.id !== habitId));
    } catch (err) {
      alert(err.message);
    }
  }

  const formatFrequency = (freq) => {
    if (freq === '3x_week') return '3x / week';
    if (freq === 'weekly') return 'Weekly';
    return 'Daily';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="headline-lg">My Habits</h1>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginTop: '2px' }}>
            Track routines, build streaks, and maintain daily momentum.
          </p>
        </div>
        <Link to="/habits/new" className="btn-primary" style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Add Habit
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="card"
          style={{
            borderColor: 'var(--priority-high-bg)',
            backgroundColor: 'var(--priority-high-bg)',
            color: 'var(--priority-high-text)',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="body-md" style={{ fontWeight: '500' }}>{error}</p>
            <button onClick={fetchHabits} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Loading your habits...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && habits.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary)' }}>
            calendar_today
          </span>
          <h2 className="headline-md">No habits yet</h2>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '360px' }}>
            Start building your routine today. Pick one manageable habit to practice consistently.
          </p>
          <Link to="/habits/new" className="btn-primary" style={{ marginTop: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Create Your First Habit
          </Link>
        </div>
      )}

      {/* Habits List */}
      {!loading && !error && habits.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {habits.map(habit => {
            const currentStreak = habit.current_streak || habit.currentStreak || 0;
            const longestStreak = habit.longest_streak || habit.longestStreak || 0;
            const isCompletedToday = Boolean(habit.is_completed_today ?? habit.isCompletedToday);
            const history7Days = habit.last_7_days || habit.last7Days || [];
            const todayItem = history7Days.find(d => d.isToday) || history7Days[history7Days.length - 1];

            return (
              <div key={habit.id} className="habit-card">
                {/* Card Top Row: Name, Frequency, Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Link
                      to={`/habits/${habit.id}`}
                      style={{ color: 'var(--on-surface)', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.target.style.color = 'var(--primary)')}
                      onMouseLeave={(e) => (e.target.style.color = 'var(--on-surface)')}
                    >
                      <h2 className="headline-sm" style={{ fontWeight: '700' }}>{habit.name}</h2>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'var(--surface-container)',
                          color: 'var(--on-surface-variant)',
                          fontSize: '11px'
                        }}
                      >
                        {formatFrequency(habit.target_frequency)}
                      </span>

                      {/* Streak Badge */}
                      <span className="badge badge-streak" title={`Longest: ${longestStreak} days`}>
                        🔥 {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
                      </span>

                      {/* Milestone Celebration */}
                      {currentStreak >= 100 && (
                        <span className="badge-milestone badge-milestone-100" title="100-day milestone reached!">
                          💯 100 Days!
                        </span>
                      )}
                      {currentStreak >= 30 && currentStreak < 100 && (
                        <span className="badge-milestone badge-milestone-30" title="30-day milestone reached!">
                          🌟 30 Days!
                        </span>
                      )}
                      {currentStreak >= 7 && currentStreak < 30 && (
                        <span className="badge-milestone badge-milestone-7" title="7-day milestone reached!">
                          ⚡ 7 Days!
                        </span>
                      )}

                      {longestStreak > currentStreak && (
                        <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                          (best: {longestStreak}d)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit & Archive */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link
                      to={`/habits/${habit.id}/edit`}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      title="Edit Habit"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                    </Link>
                    <button
                      onClick={() => handleArchive(habit.id)}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--outline)' }}
                      title="Archive Habit"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>archive</span>
                    </button>
                  </div>
                </div>

                {/* Card Middle: Quick Today Check-In Button */}
                {todayItem && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="label-md" style={{ color: 'var(--on-surface)' }}>
                        Today's Status
                      </span>
                      <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                        ({todayItem.date})
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleCheckin(habit.id, todayItem.date)}
                      className={isCompletedToday ? 'btn-primary' : 'btn-secondary'}
                      style={{
                        padding: '6px 14px',
                        fontSize: '13px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: isCompletedToday ? 'var(--primary)' : 'var(--surface-container-lowest)'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {isCompletedToday ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      {isCompletedToday ? 'Completed' : 'Mark Done'}
                    </button>
                  </div>
                )}

                {/* Card Bottom: 7-Day History Grid */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      Last 7 Days (Click any day to toggle)
                    </span>
                    <Link
                      to={`/habits/${habit.id}`}
                      className="label-sm"
                      style={{ color: 'var(--primary)', fontWeight: '600' }}
                    >
                      Details & History →
                    </Link>
                  </div>

                  <div className="history-grid-container">
                    {history7Days.map((dayObj) => {
                      const isToggling = Boolean(togglingKeys[`${habit.id}-${dayObj.date}`]);
                      return (
                        <button
                          key={dayObj.date}
                          type="button"
                          onClick={() => handleToggleCheckin(habit.id, dayObj.date)}
                          className={`day-square-btn ${dayObj.completed ? 'completed' : 'pending'} ${dayObj.isToday ? 'is-today' : ''}`}
                          title={`${dayObj.dayOfWeek} ${dayObj.date}: ${dayObj.completed ? 'Completed' : 'Missed'} (click to toggle)`}
                          style={{ opacity: isToggling ? 0.6 : 1 }}
                        >
                          <span className="day-label">{dayObj.dayOfWeek?.[0] || '•'}</span>
                          <span className="day-val">
                            {dayObj.completed ? (
                              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                                check
                              </span>
                            ) : (
                              dayObj.day
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
