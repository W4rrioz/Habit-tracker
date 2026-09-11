import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [metric, setMetric] = useState('current');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard(metric);
  }, [metric]);

  async function fetchLeaderboard(selectedMetric) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/leaderboard?metric=${selectedMetric}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load leaderboard rankings.');
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.leaderboard || []);
      setLeaderboard(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const currentUserEntry = leaderboard.find((item) => item.is_current_user);
  const topThree = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  return (
    <div className="flex flex-col w-full max-w-[560px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Leaderboard
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>
            <span>Celebrate community consistency & streaks</span>
          </p>
        </div>
      </div>

      {/* Metric Toggle Pills */}
      <div className="flex items-center bg-surface-container-low p-1 rounded-full mb-6 shadow-sm">
        <button
          onClick={() => setMetric('current')}
          className={`flex-1 py-2 px-3 rounded-full font-label-md text-xs font-semibold text-center transition-all ${
            metric === 'current'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Current Streak
        </button>
        <button
          onClick={() => setMetric('longest')}
          className={`flex-1 py-2 px-3 rounded-full font-label-md text-xs font-semibold text-center transition-all ${
            metric === 'longest'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          All-Time Longest
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-on-surface-variant font-medium">Loading rankings...</div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-4xl text-outline-variant mb-2 block">leaderboard</span>
          <p className="font-headline-sm text-sm font-semibold text-on-surface">No streak data yet</p>
          <p className="font-body-sm text-xs text-on-surface-variant mt-1">
            Check in your habits today to climb the leaderboard!
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 items-end">
              {/* #2 Rank */}
              {topThree[1] && (
                <div className="flex flex-col items-center bg-surface-container-lowest rounded-lg p-3 shadow-sm border border-outline-variant/20 order-1">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center mb-1 shadow-sm">
                    2
                  </span>
                  <div className="w-10 h-10 rounded-full bg-surface-container-low text-on-surface font-bold text-xs flex items-center justify-center uppercase mb-1.5 shadow-inner">
                    {topThree[1].username.slice(0, 2)}
                  </div>
                  <span className="font-label-md text-xs font-semibold text-on-surface truncate max-w-[80px]">
                    @{topThree[1].username}
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-xs font-bold text-secondary">
                    <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                    <span>{topThree[1].streak}d</span>
                  </div>
                </div>
              )}

              {/* #1 Rank (Champion) */}
              {topThree[0] && (
                <div className="flex flex-col items-center bg-surface-container-lowest rounded-lg p-4 shadow-md border-2 border-secondary-container order-2 pb-5">
                  <span className="w-7 h-7 rounded-full bg-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center mb-1 shadow-sm">
                    👑
                  </span>
                  <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container font-bold text-sm flex items-center justify-center uppercase mb-2 shadow-sm">
                    {topThree[0].username.slice(0, 2)}
                  </div>
                  <span className="font-label-md text-xs font-bold text-primary truncate max-w-[90px]">
                    @{topThree[0].username}
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-sm font-bold text-secondary">
                    <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                    <span>{topThree[0].streak}d</span>
                  </div>
                </div>
              )}

              {/* #3 Rank */}
              {topThree[2] && (
                <div className="flex flex-col items-center bg-surface-container-lowest rounded-lg p-3 shadow-sm border border-outline-variant/20 order-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center justify-center mb-1 shadow-sm">
                    3
                  </span>
                  <div className="w-10 h-10 rounded-full bg-surface-container-low text-on-surface font-bold text-xs flex items-center justify-center uppercase mb-1.5 shadow-inner">
                    {topThree[2].username.slice(0, 2)}
                  </div>
                  <span className="font-label-md text-xs font-semibold text-on-surface truncate max-w-[80px]">
                    @{topThree[2].username}
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-xs font-bold text-secondary">
                    <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                    <span>{topThree[2].streak}d</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current User Standing Banner */}
          {currentUserEntry && (
            <div className="mb-4 p-3 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-secondary text-on-secondary text-xs font-bold flex items-center justify-center">
                  #{currentUserEntry.rank}
                </span>
                <span className="text-xs font-bold">Your Standing: @{currentUserEntry.username}</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold">
                <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                <span>{currentUserEntry.streak} days</span>
              </div>
            </div>
          )}

          {/* User List */}
          <div className="flex flex-col gap-2">
            {leaderboard.map((item) => (
              <div
                key={item.username}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  item.is_current_user
                    ? 'bg-primary-fixed text-on-primary-fixed border border-primary/20 shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                      item.rank === 1
                        ? 'bg-amber-300 text-amber-900'
                        : item.rank === 2
                        ? 'bg-slate-200 text-slate-700'
                        : item.rank === 3
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-surface-container-low text-outline'
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant font-semibold text-xs flex items-center justify-center uppercase">
                    {item.username.slice(0, 2)}
                  </div>
                  <span className="font-body-md text-xs font-semibold truncate">
                    @{item.username} {item.is_current_user && '(You)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-bold text-xs text-secondary shrink-0">
                  <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                  <span>{item.streak} days</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
