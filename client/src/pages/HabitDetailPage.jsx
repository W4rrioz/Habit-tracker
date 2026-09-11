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

  const getMilestoneBadge = (streak) => {
    if (streak >= 100) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
          💯 100 Days!
        </span>
      );
    }
    if (streak >= 30) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
          🌟 30 Days!
        </span>
      );
    }
    if (streak >= 7) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold">
          ⚡ 7 Days!
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="w-full max-w-[560px] mx-auto py-16 text-center text-xs text-on-surface-variant font-medium">
        Loading habit overview...
      </div>
    );
  }

  if (error || !habitData) {
    return (
      <div className="w-full max-w-[560px] mx-auto py-12 text-center">
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/20 flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-error">error_outline</span>
          <h2 className="font-headline text-lg font-bold text-on-surface">Habit Not Found</h2>
          <p className="font-body text-xs text-on-surface-variant max-w-sm">
            {error || 'The requested habit does not exist or has been removed.'}
          </p>
          <Link
            to="/habits"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm"
          >
            Back to Habits
          </Link>
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
    <div className="w-full max-w-[560px] mx-auto pb-16 flex flex-col gap-4">
      {/* Back Link */}
      <div className="pt-2">
        <Link
          to="/habits"
          className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Habits</span>
        </Link>
      </div>

      {/* Habit Overview Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
                {formatFrequency(habit.target_frequency)}
              </span>
              {habit.is_archived && (
                <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-outline text-[10px] font-semibold">
                  Archived
                </span>
              )}
              {getMilestoneBadge(currentStreak)}
            </div>
            <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight truncate">
              {habit.name}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to={`/habits/${id}/edit`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit</span>
            </Link>
            <button
              onClick={handleArchive}
              className="p-1.5 rounded-full hover:bg-surface-container text-outline hover:text-error transition-colors"
              title="Archive Habit"
            >
              <span className="material-symbols-outlined text-[18px]">archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Streak Metrics Cards (3-column) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {/* Current Streak */}
        <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col items-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Current
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-primary leading-tight">
              {currentStreak}
            </span>
            <span className="text-[11px] font-medium text-on-surface-variant">d</span>
          </div>
          <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5">
            <span>🔥</span> Active
          </span>
        </div>

        {/* Longest Streak */}
        <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col items-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Best
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-secondary leading-tight">
              {longestStreak}
            </span>
            <span className="text-[11px] font-medium text-on-surface-variant">d</span>
          </div>
          <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5">
            <span>🏆</span> Record
          </span>
        </div>

        {/* Total Check-ins */}
        <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col items-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Total
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-on-surface leading-tight">
              {totalCheckins}
            </span>
            <span className="text-[11px] font-medium text-on-surface-variant">times</span>
          </div>
          <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5">
            <span>✓</span> Lifetime
          </span>
        </div>
      </div>

      {/* 7-Day Consistency Grid */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline text-sm font-bold text-on-surface">7-Day Consistency Grid</h2>
            <p className="font-body text-[11px] text-on-surface-variant">
              Tap any day to toggle check-in status.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
          {last7Days.map((dayObj) => {
            const isPending = togglingDate === dayObj.date;
            return (
              <button
                key={dayObj.date}
                type="button"
                onClick={() => handleToggle(dayObj.date)}
                disabled={isPending}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all ${
                  dayObj.completed
                    ? 'bg-primary text-on-primary shadow-sm active:scale-95'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                } ${dayObj.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface' : ''}`}
                title={`${dayObj.dayOfWeek} ${dayObj.date}: ${dayObj.completed ? 'Completed' : 'Missed'} (click to toggle)`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  {dayObj.dayOfWeek}
                </span>
                <span className="text-sm font-bold my-0.5">
                  {dayObj.completed ? (
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  ) : (
                    dayObj.day
                  )}
                </span>
                {dayObj.isToday ? (
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${dayObj.completed ? 'text-white' : 'text-primary'}`}>
                    Today
                  </span>
                ) : (
                  <span className="text-[9px] opacity-0 pointer-events-none">•</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Check-ins History */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 flex flex-col gap-3">
        <h2 className="font-headline text-sm font-bold text-on-surface">Recent Check-ins</h2>
        {checkinHistory.length === 0 ? (
          <p className="font-body text-xs text-on-surface-variant">
            No check-in history recorded yet. Complete today's check-in to start your streak!
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {checkinHistory.slice(0, 12).map((dateStr) => (
              <span
                key={dateStr}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-[11px] font-medium"
              >
                <span className="material-symbols-outlined text-[13px] text-primary">check_circle</span>
                <span>{dateStr}</span>
              </span>
            ))}
            {checkinHistory.length > 12 && (
              <span className="self-center text-xs text-outline font-medium px-2">
                +{checkinHistory.length - 12} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stage 6: Consistency Analytics & Visualizations */}
      {statsLoading && !stats ? (
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/20 text-center text-xs text-on-surface-variant font-medium">
          Loading habit analytics...
        </div>
      ) : stats && stats.total_checkins < 3 ? (
        /* Empty State for habits with < 3 check-ins */
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/20 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">insights</span>
          </div>
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface">
              Consistency Trends & Charts
            </h2>
            <p className="font-body text-xs text-on-surface-variant max-w-xs mt-1">
              Not enough data yet — keep checking in to see your trends!
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-surface-container text-primary text-[11px] font-bold">
            {stats.total_checkins} of 3 check-ins completed to unlock analytics
          </div>
        </div>
      ) : stats ? (
        <div className="flex flex-col gap-4">
          {/* Section Title */}
          <div className="flex items-center justify-between mt-2">
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Consistency Analytics</h2>
              <p className="font-body text-[11px] text-on-surface-variant">
                Visual breakdowns and long-term momentum tracking
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
              {stats.completion_rate_30d}% 30-Day Rate
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Donut Chart Card */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 flex flex-col items-center gap-4">
              <div className="w-full flex items-center justify-between">
                <span className="font-headline text-xs font-bold text-on-surface">
                  30-Day Completion
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">Rolling 30 Days</span>
              </div>

              {/* SVG Ring */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg
                  className="w-36 h-36 -rotate-90"
                  viewBox="0 0 160 160"
                >
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="14"
                    className="text-surface-container"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 64}
                    strokeDashoffset={2 * Math.PI * 64 * (1 - (stats.completion_rate_30d || 0) / 100)}
                    className="text-secondary transition-all duration-700 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-on-surface leading-tight">
                    {stats.completion_rate_30d}%
                  </span>
                  <span className="text-[10px] font-medium text-on-surface-variant">
                    Completed
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="w-full pt-3 border-t border-outline-variant/10 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-on-surface font-medium">
                    <strong>{stats.completion_ring?.completed || 0}</strong> days
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-surface-container-high border border-outline-variant"></span>
                  <span className="text-on-surface-variant font-medium">
                    <strong>{stats.completion_ring?.missed || 0}</strong> missed
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Trends & Distribution Card */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-headline text-xs font-bold text-on-surface">
                  {chartView === 'dow' ? 'Day of Week' : `Trend (${trendDays}d)`}
                </span>

                <div className="inline-flex bg-surface-container p-0.5 rounded-full text-[10px]">
                  <button
                    type="button"
                    onClick={() => setChartView('dow')}
                    className={`px-2 py-0.5 rounded-full font-semibold transition-all ${
                      chartView === 'dow'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('trend')}
                    className={`px-2 py-0.5 rounded-full font-semibold transition-all ${
                      chartView === 'trend'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    Trend
                  </button>
                </div>
              </div>

              {chartView === 'dow' ? (
                /* Day of Week Distribution */
                <div className="flex flex-col flex-1 justify-end pt-2">
                  <div className="flex items-end justify-between h-32 gap-1.5 pb-1 border-b border-outline-variant/15">
                    {(stats.day_of_week_array || []).map((item) => {
                      const maxVal = Math.max(...(stats.day_of_week_array || []).map((d) => d.count), 1);
                      const barPct = item.count > 0 ? Math.max((item.count / maxVal) * 100, 12) : 4;
                      return (
                        <div
                          key={item.day}
                          className="flex flex-col items-center flex-1 h-full justify-end"
                        >
                          <span className="text-[9px] text-on-surface-variant font-medium mb-1">
                            {item.count}
                          </span>
                          <div
                            className={`w-full max-w-[24px] rounded-t-md transition-all duration-300 ${
                              item.count > 0 ? 'bg-primary' : 'bg-surface-container'
                            }`}
                            style={{ height: `${barPct}%` }}
                            title={`${item.day}: ${item.count} check-ins`}
                          />
                          <span className="text-[10px] font-semibold text-on-surface mt-1.5">
                            {item.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Daily Trend Bar Chart */
                <div className="flex flex-col flex-1 justify-end pt-1">
                  <div className="flex justify-end gap-1 mb-1">
                    <button
                      type="button"
                      onClick={() => setTrendDays(14)}
                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${
                        trendDays === 14 ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      14d
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendDays(30)}
                      className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${
                        trendDays === 30 ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      30d
                    </button>
                  </div>

                  <div className="flex items-end justify-between h-32 gap-1 pb-1 border-b border-outline-variant/15 relative">
                    {((trendDays === 30 ? stats.daily_trend_30d : stats.daily_trend_14d) || []).map((dayObj, idx) => {
                      const isHovered = hoveredTrendIndex === idx;
                      return (
                        <div
                          key={dayObj.date}
                          className="flex flex-col items-center flex-1 h-full justify-end relative"
                          onMouseEnter={() => setHoveredTrendIndex(idx)}
                          onMouseLeave={() => setHoveredTrendIndex(null)}
                        >
                          {isHovered && (
                            <div className="absolute bottom-full mb-1 bg-inverse-surface text-inverse-on-surface text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap z-20 pointer-events-none">
                              {dayObj.dayOfWeek} {dayObj.date}: {dayObj.completed ? '✓' : 'Missed'}
                            </div>
                          )}
                          <div
                            className={`w-full rounded-t-xs transition-all ${
                              dayObj.completed ? 'bg-secondary' : 'bg-surface-container'
                            }`}
                            style={{ height: dayObj.completed ? '80%' : '15%' }}
                          />
                          <span className="text-[8px] text-on-surface-variant mt-1">
                            {trendDays === 30 ? (idx % 6 === 0 ? dayObj.day : '') : dayObj.day}
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
