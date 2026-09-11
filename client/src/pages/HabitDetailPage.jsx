import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function HabitDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [habitData, setHabitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingDate, setTogglingDate] = useState(null);

  // Stage 6: Habit Statistics & Visualizations
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(14); // 14 or 30 days
  const [chartView, setChartView] = useState('dow'); // 'dow' (day of week) or 'trend' (daily trend)
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState(null);

  useEffect(() => {
    fetchHabit();
    fetchStats();
  }, [id]);

  async function fetchHabit() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/habits/${id}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Habit not found or access denied.');
        }
        throw new Error('Failed to load habit details.');
      }
      const data = await res.json();
      setHabitData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      setStatsLoading(true);
      const res = await fetch(`/api/habits/${id}/stats`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching habit stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }

  async function handleToggle(date) {
    if (togglingDate) return;
    setTogglingDate(date);

    // Optimistic toggle of 7 days
    setHabitData(prev => {
      if (!prev) return prev;
      const updated7 = (prev.last_7_days || []).map(d => {
        if (d.date === date) return { ...d, completed: !d.completed };
        return d;
      });
      return {
        ...prev,
        last_7_days: updated7,
        last7Days: updated7
      };
    });

    try {
      const res = await fetch(`/api/habits/${id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date })
      });

      if (!res.ok) {
        throw new Error('Failed to toggle check-in.');
      }

      const updated = await res.json();
      setHabitData(prev => {
        if (!prev) return prev;
        const habit = prev.habit || {};
        return {
          ...prev,
          habit: {
            ...habit,
            current_streak: updated.current_streak,
            currentStreak: updated.currentStreak,
            longest_streak: updated.longest_streak,
            longestStreak: updated.longestStreak,
            total_checkins: updated.total_checkins,
            totalCheckins: updated.totalCheckins,
            is_completed_today: updated.is_completed_today,
            isCompletedToday: updated.isCompletedToday
          },
          streaks: updated.streaks,
          last_7_days: updated.last_7_days || updated.last7Days || prev.last_7_days,
          last7Days: updated.last_7_days || updated.last7Days || prev.last_7_days
        };
      });

      // Synchronize visual charts & stats
      fetchStats();
    } catch (err) {
      fetchHabit();
      fetchStats();
    } finally {
      setTogglingDate(null);
    }
  }

  async function handleArchive() {
    if (!window.confirm('Archive this habit?')) return;
    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to archive habit.');
      }
      navigate('/habits');
    } catch (err) {
      alert(err.message);
    }
  }

  const formatFrequency = (freq) => {
    if (freq === '3x_week') return '3x / week';
    if (freq === 'weekly') return 'Weekly';
    return 'Daily';
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '720px', margin: '40px auto', textAlign: 'center' }}>
        <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Loading habit overview...</p>
      </div>
    );
  }

  if (error || !habitData) {
    return (
      <div style={{ maxWidth: '720px', margin: '40px auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '32px' }}>
          <h2 className="headline-md" style={{ marginBottom: '8px' }}>Habit Not Found</h2>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
            {error || 'The requested habit does not exist or has been removed.'}
          </p>
          <Link to="/habits" className="btn-primary">Back to Habits</Link>
        </div>
      </div>
    );
  }

  const habit = habitData.habit || habitData;
  const streaks = habitData.streaks || {
    currentStreak: habit.current_streak || 0,
    longestStreak: habit.longest_streak || 0,
    totalCheckins: habit.total_checkins || 0
  };
  const currentStreak = streaks.current_streak ?? streaks.currentStreak ?? 0;
  const longestStreak = streaks.longest_streak ?? streaks.longestStreak ?? 0;
  const totalCheckins = streaks.total_checkins ?? streaks.totalCheckins ?? (habitData.checkins?.length || 0);
  const last7Days = habitData.last_7_days || habitData.last7Days || [];
  const checkinHistory = habitData.checkins || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px', margin: '0 auto' }}>
      {/* Back Link */}
      <div>
        <Link
          to="/habits"
          className="label-sm"
          style={{ color: 'var(--on-surface-variant)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          Back to My Habits
        </Link>
      </div>

      {/* Habit Overview Header */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
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
              {habit.is_archived && (
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'var(--surface-container-high)',
                    color: 'var(--outline)',
                    fontSize: '11px'
                  }}
                >
                  Archived
                </span>
              )}
            </div>
            <h1 className="headline-lg">{habit.name}</h1>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link to={`/habits/${id}/edit`} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
              Edit Habit
            </Link>
            <button
              onClick={handleArchive}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--outline)' }}
              title="Archive Habit"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Streak Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {/* Current Streak */}
        <div className="stat-card">
          <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>Current Streak</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '36px', fontWeight: '800', color: 'var(--primary)', lineHeight: 1 }}>
              {currentStreak}
            </span>
            <span className="body-md" style={{ color: 'var(--on-surface-variant)', fontWeight: '600' }}>
              {currentStreak === 1 ? 'day' : 'days'}
            </span>
            {currentStreak >= 100 && (
              <span className="badge-milestone badge-milestone-100" style={{ marginLeft: '4px' }}>
                💯 100 Days!
              </span>
            )}
            {currentStreak >= 30 && currentStreak < 100 && (
              <span className="badge-milestone badge-milestone-30" style={{ marginLeft: '4px' }}>
                🌟 30 Days!
              </span>
            )}
            {currentStreak >= 7 && currentStreak < 30 && (
              <span className="badge-milestone badge-milestone-7" style={{ marginLeft: '4px' }}>
                ⚡ 7 Days!
              </span>
            )}
          </div>
          <span className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px' }}>
            🔥 Active momentum
          </span>
        </div>

        {/* Longest Streak */}
        <div className="stat-card">
          <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>Longest Streak</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '36px', fontWeight: '800', color: 'var(--secondary)', lineHeight: 1 }}>
              {longestStreak}
            </span>
            <span className="body-md" style={{ color: 'var(--on-surface-variant)', fontWeight: '600' }}>
              {longestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <span className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px' }}>
            🏆 Personal record
          </span>
        </div>

        {/* Total Check-ins */}
        <div className="stat-card">
          <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>Total Check-ins</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '36px', fontWeight: '800', color: 'var(--on-surface)', lineHeight: 1 }}>
              {totalCheckins}
            </span>
            <span className="body-md" style={{ color: 'var(--on-surface-variant)', fontWeight: '600' }}>
              times
            </span>
          </div>
          <span className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px' }}>
            ✓ Lifetime consistency
          </span>
        </div>
      </div>

      {/* 7-Day History Grid Card */}
      <div className="card">
        <div style={{ marginBottom: '16px' }}>
          <h2 className="headline-sm">7-Day Consistency Grid</h2>
          <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '2px' }}>
            Tap any day square to quickly mark or unmark completion.
          </p>
        </div>

        <div className="history-grid-container" style={{ padding: '8px 0' }}>
          {last7Days.map(dayObj => {
            const isPending = togglingDate === dayObj.date;
            return (
              <button
                key={dayObj.date}
                type="button"
                onClick={() => handleToggle(dayObj.date)}
                className={`day-square-btn ${dayObj.completed ? 'completed' : 'pending'} ${dayObj.isToday ? 'is-today' : ''}`}
                title={`${dayObj.dayOfWeek} ${dayObj.date}: ${dayObj.completed ? 'Completed' : 'Missed'} (click to toggle)`}
                style={{
                  width: '54px',
                  height: '64px',
                  opacity: isPending ? 0.6 : 1
                }}
              >
                <span className="day-label" style={{ fontSize: '12px' }}>{dayObj.dayOfWeek}</span>
                <span className="day-val" style={{ fontSize: '15px' }}>
                  {dayObj.completed ? (
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                  ) : (
                    dayObj.day
                  )}
                </span>
                {dayObj.isToday && (
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: dayObj.completed ? 'rgba(255,255,255,0.9)' : 'var(--primary)',
                      marginTop: '2px'
                    }}
                  >
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Check-in History */}
      <div className="card">
        <h2 className="headline-sm" style={{ marginBottom: '12px' }}>Recent Check-ins</h2>
        {checkinHistory.length === 0 ? (
          <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
            No check-in history recorded yet. Complete today's check-in above to start your streak!
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {checkinHistory.slice(0, 14).map(dateStr => (
              <span
                key={dateStr}
                className="badge"
                style={{
                  backgroundColor: 'var(--surface-container-low)',
                  border: '1px solid var(--surface-container-high)',
                  color: 'var(--on-surface)',
                  padding: '6px 12px',
                  fontSize: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--primary)' }}>
                  check_circle
                </span>
                {dateStr}
              </span>
            ))}
            {checkinHistory.length > 14 && (
              <span className="body-sm" style={{ alignSelf: 'center', color: 'var(--outline)' }}>
                +{checkinHistory.length - 14} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stage 6: Consistency Analytics & Visualizations */}
      {statsLoading && !stats ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Loading habit analytics...</p>
        </div>
      ) : stats && stats.total_checkins < 3 ? (
        /* Empty State for habits with < 3 check-ins */
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-container-low)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '30px' }}>
              insights
            </span>
          </div>
          <h2 className="headline-sm" style={{ color: 'var(--on-surface)' }}>Consistency Trends & Charts</h2>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)', maxWidth: '440px' }}>
            Not enough data yet — keep checking in to see your trends!
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--surface-container-low)',
              border: '1px solid var(--surface-container-high)',
              marginTop: '4px'
            }}
          >
            <span className="label-sm" style={{ color: 'var(--primary)' }}>
              {stats.total_checkins} of 3 check-ins completed to unlock analytics
            </span>
          </div>
        </div>
      ) : stats ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="headline-sm">Consistency Analytics</h2>
              <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Visual breakdowns and long-term momentum tracking
              </p>
            </div>
            <span
              className="badge"
              style={{
                backgroundColor: 'var(--secondary-container)',
                color: 'var(--on-secondary-container)',
                fontSize: '11px'
              }}
            >
              {stats.completion_rate_30d}% 30-Day Rate
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* 1. Completion Ring (Donut Chart) Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', gap: '20px' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="label-md" style={{ color: 'var(--on-surface)' }}>30-Day Completion Ring</span>
                <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>Rolling 30 Days</span>
              </div>

              {/* Donut SVG */}
              <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                <svg
                  width="180"
                  height="180"
                  viewBox="0 0 180 180"
                  style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}
                >
                  {/* Background track (missed/uncompleted) */}
                  <circle
                    cx="90"
                    cy="90"
                    r="72"
                    fill="transparent"
                    stroke="var(--surface-container-high)"
                    strokeWidth="16"
                  />
                  {/* Completed active arc */}
                  <circle
                    cx="90"
                    cy="90"
                    r="72"
                    fill="transparent"
                    stroke="var(--secondary)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 72}
                    strokeDashoffset={2 * Math.PI * 72 * (1 - (stats.completion_rate_30d || 0) / 100)}
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>

                {/* Center metric */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--on-surface)', lineHeight: 1 }}>
                    {stats.completion_rate_30d}%
                  </span>
                  <span className="label-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                    Completed
                  </span>
                </div>
              </div>

              {/* Breakdown Legend */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', width: '100%', paddingTop: '8px', borderTop: '1px solid var(--surface-container-high)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--secondary)'
                    }}
                  />
                  <span className="body-sm" style={{ color: 'var(--on-surface)' }}>
                    <strong>{stats.completion_ring?.completed || 0}</strong> days completed
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--surface-container-high)',
                      border: '1px solid var(--outline-variant)'
                    }}
                  />
                  <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                    <strong>{stats.completion_ring?.missed || 0}</strong> missed
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Trends & Distribution Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '24px 20px', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span className="label-md" style={{ color: 'var(--on-surface)' }}>
                  {chartView === 'dow' ? 'Day of Week Distribution' : `Daily Trend (${trendDays} Days)`}
                </span>

                {/* View Switcher Pills */}
                <div style={{ display: 'inline-flex', backgroundColor: 'var(--surface-container-low)', padding: '2px', borderRadius: 'var(--radius-full)', border: '1px solid var(--surface-container-high)' }}>
                  <button
                    type="button"
                    onClick={() => setChartView('dow')}
                    style={{
                      border: 'none',
                      background: chartView === 'dow' ? 'var(--surface-container-lowest)' : 'transparent',
                      color: chartView === 'dow' ? 'var(--primary)' : 'var(--on-surface-variant)',
                      fontWeight: chartView === 'dow' ? '600' : '500',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      boxShadow: chartView === 'dow' ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Day of Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('trend')}
                    style={{
                      border: 'none',
                      background: chartView === 'trend' ? 'var(--surface-container-lowest)' : 'transparent',
                      color: chartView === 'trend' ? 'var(--primary)' : 'var(--on-surface-variant)',
                      fontWeight: chartView === 'trend' ? '600' : '500',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      boxShadow: chartView === 'trend' ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Daily Trend
                  </button>
                </div>
              </div>

              {chartView === 'dow' ? (
                /* Bar Chart: Day of Week Distribution */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
                    Lifetime check-ins across each day of the week.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      height: '150px',
                      gap: '8px',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--surface-container-high)'
                    }}
                  >
                    {(stats.day_of_week_array || []).map(item => {
                      const maxVal = Math.max(...(stats.day_of_week_array || []).map(d => d.count), 1);
                      const barPct = item.count > 0 ? Math.max((item.count / maxVal) * 100, 10) : 4;
                      return (
                        <div
                          key={item.day}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flex: 1,
                            height: '100%',
                            justifyContent: 'flex-end'
                          }}
                        >
                          <span className="label-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '4px', fontSize: '11px' }}>
                            {item.count}
                          </span>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '32px',
                              height: `${barPct}%`,
                              backgroundColor: item.count > 0 ? 'var(--primary)' : 'var(--surface-container-high)',
                              borderRadius: '6px 6px 0 0',
                              transition: 'height 0.3s ease, background-color 0.2s ease'
                            }}
                            title={`${item.day}: ${item.count} check-ins`}
                          />
                          <span className="label-sm" style={{ color: 'var(--on-surface)', marginTop: '8px', fontSize: '11px' }}>
                            {item.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Bar Chart: Daily Completion Trend */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      Completed vs missed daily cadence.
                    </p>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setTrendDays(14)}
                        style={{
                          border: 'none',
                          background: trendDays === 14 ? 'var(--primary-fixed)' : 'var(--surface-container-low)',
                          color: trendDays === 14 ? 'var(--on-primary-fixed)' : 'var(--on-surface-variant)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        14d
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendDays(30)}
                        style={{
                          border: 'none',
                          background: trendDays === 30 ? 'var(--primary-fixed)' : 'var(--surface-container-low)',
                          color: trendDays === 30 ? 'var(--on-primary-fixed)' : 'var(--on-surface-variant)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        30d
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      height: '150px',
                      gap: trendDays === 30 ? '3px' : '6px',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--surface-container-high)',
                      position: 'relative'
                    }}
                  >
                    {((trendDays === 30 ? stats.daily_trend_30d : stats.daily_trend_14d) || []).map((dayObj, idx) => {
                      const isHovered = hoveredTrendIndex === idx;
                      return (
                        <div
                          key={dayObj.date}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flex: 1,
                            height: '100%',
                            justifyContent: 'flex-end',
                            position: 'relative'
                          }}
                          onMouseEnter={() => setHoveredTrendIndex(idx)}
                          onMouseLeave={() => setHoveredTrendIndex(null)}
                        >
                          {isHovered && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '100%',
                                marginBottom: '6px',
                                backgroundColor: 'var(--inverse-surface)',
                                color: 'var(--inverse-on-surface)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '10px',
                                whiteSpace: 'nowrap',
                                zIndex: 20,
                                pointerEvents: 'none',
                                boxShadow: 'var(--shadow-md)'
                              }}
                            >
                              {dayObj.dayOfWeek} {dayObj.date}: {dayObj.completed ? 'Completed ✓' : 'Missed'}
                            </div>
                          )}
                          <div
                            style={{
                              width: '100%',
                              maxWidth: trendDays === 30 ? '14px' : '28px',
                              height: dayObj.completed ? '82%' : '18%',
                              backgroundColor: dayObj.completed ? 'var(--secondary)' : 'var(--surface-container-high)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                          />
                          <span
                            className="label-sm"
                            style={{
                              fontSize: trendDays === 30 ? '8px' : '10px',
                              color: dayObj.isToday ? 'var(--primary)' : 'var(--on-surface-variant)',
                              fontWeight: dayObj.isToday ? '700' : '400',
                              marginTop: '6px'
                            }}
                          >
                            {trendDays === 30 ? (idx % 5 === 0 || idx === 29 ? dayObj.day : '') : dayObj.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
