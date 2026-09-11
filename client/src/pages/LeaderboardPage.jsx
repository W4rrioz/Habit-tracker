import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [metric, setMetric] = useState('current'); // 'current' | 'longest'
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
        if (res.status === 401) {
          throw new Error('Please sign in to view the community leaderboard.');
        }
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

  // Identify current user's entry for top summary if present
  const currentUserEntry = leaderboard.find((item) => item.is_current_user);
  const topThree = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  const getRankBadgeClass = (rank) => {
    if (rank === 1) return 'rank-badge rank-badge-1';
    if (rank === 2) return 'rank-badge rank-badge-2';
    if (rank === 3) return 'rank-badge rank-badge-3';
    return 'rank-badge rank-badge-default';
  };

  const getRowPodiumClass = (rank, isCurrentUser) => {
    let classes = 'leaderboard-row';
    if (isCurrentUser) classes += ' is-current-user';
    else if (rank === 1) classes += ' podium-1';
    else if (rank === 2) classes += ' podium-2';
    else if (rank === 3) classes += ' podium-3';
    return classes;
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encouraging Community Header Banner */}
      <div className="leaderboard-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '420px' }}>
            <div className="leaderboard-banner-pill">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>celebration</span>
              <span>Together in Growth</span>
            </div>
            <h1 className="headline-md" style={{ color: 'var(--on-surface)', marginBottom: '4px' }}>
              Community Milestones
            </h1>
            <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
              {currentUserEntry ? (
                <>
                  You're currently ranked <strong>#{currentUserEntry.rank}</strong> with a{' '}
                  <strong>{currentUserEntry.streak}-day</strong> {metric === 'current' ? 'current' : 'best'} streak! Keep the momentum going.
                </>
              ) : (
                'Every mindful step counts. Track your habits and build your streak alongside the community!'
              )}
            </p>
          </div>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary-fixed)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>eco</span>
          </div>
        </div>
      </div>

      {/* Segmented Ranking Pill Selector */}
      <div className="leaderboard-toggle-pill" role="tablist" aria-label="Streak Metric Selector">
        <button
          type="button"
          role="tab"
          aria-selected={metric === 'current'}
          className={`leaderboard-toggle-btn ${metric === 'current' ? 'active' : ''}`}
          onClick={() => setMetric('current')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>local_fire_department</span>
          Current Streak
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={metric === 'longest'}
          className={`leaderboard-toggle-btn ${metric === 'longest' ? 'active' : ''}`}
          onClick={() => setMetric('longest')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>workspace_premium</span>
          Longest Streak
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>
            progress_activity
          </span>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginTop: '12px' }}>
            Loading community rankings...
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="card" style={{ textAlign: 'center', padding: '28px 20px', borderColor: 'var(--error)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--error)' }}>
            error_outline
          </span>
          <p className="body-md" style={{ color: 'var(--error)', marginTop: '8px', fontWeight: '600' }}>
            {error}
          </p>
          <button
            onClick={() => fetchLeaderboard(metric)}
            className="btn-secondary"
            style={{ marginTop: '14px', alignSelf: 'center' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && leaderboard.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)', marginBottom: '8px' }}>
            emoji_events
          </span>
          <h3 className="headline-sm" style={{ marginBottom: '6px' }}>No Active Streaks Yet</h3>
          <p className="body-sm" style={{ color: 'var(--on-surface-variant)', maxWidth: '380px', margin: '0 auto' }}>
            Be the first to claim a spot on the leaderboard! Create a habit and check in daily to start your streak.
          </p>
        </div>
      )}

      {/* Content: Podium & Ranked List */}
      {!loading && !error && leaderboard.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top 3 Podium Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topThree.map((item) => {
              const initial = item.username ? item.username.charAt(0).toUpperCase() : '?';
              return (
                <div
                  key={`${item.username}-${item.rank}`}
                  className={getRowPodiumClass(item.rank, item.is_current_user)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    {/* Rank Badge */}
                    <div className={getRankBadgeClass(item.rank)}>
                      {item.rank}
                    </div>

                    {/* Safe Avatar Placeholder (First letter only, no private photos) */}
                    <div className={`user-avatar-circle ${item.is_current_user ? 'current-user-avatar' : ''}`}>
                      {initial}
                    </div>

                    {/* Safe Username Only (No private habit names or personal info) */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          className="label-lg"
                          style={{
                            color: item.is_current_user ? 'var(--on-secondary-container)' : 'var(--on-surface)',
                            fontWeight: '700',
                          }}
                        >
                          @{item.username}
                        </span>
                        {item.is_current_user && (
                          <span className="badge-you">YOU</span>
                        )}
                        {item.rank === 1 && (
                          <span
                            className="label-sm"
                            style={{
                              color: 'var(--secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '11px',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>verified</span>
                            Top Rank
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Streak Value */}
                  <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                    <div
                      className={`streak-pill ${
                        item.is_current_user
                          ? 'streak-pill-current-user'
                          : item.rank === 1
                          ? 'streak-pill-gold'
                          : ''
                      }`}
                    >
                      <span className="material-symbols-outlined">local_fire_department</span>
                      <span>{item.streak} {item.streak === 1 ? 'day' : 'days'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subsequent Ranks (#4+) */}
          {others.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                <span className="label-md" style={{ color: 'var(--on-surface-variant)' }}>
                  Other Steady Climbers
                </span>
                <span className="label-sm" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>volunteer_activism</span>
                  Keep Cheering
                </span>
              </div>

              {others.map((item) => {
                const initial = item.username ? item.username.charAt(0).toUpperCase() : '?';
                return (
                  <div
                    key={`${item.username}-${item.rank}`}
                    className={getRowPodiumClass(item.rank, item.is_current_user)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {/* Rank Badge */}
                      <div className={getRankBadgeClass(item.rank)}>
                        {item.rank}
                      </div>

                      {/* Safe Avatar Placeholder */}
                      <div className={`user-avatar-circle ${item.is_current_user ? 'current-user-avatar' : ''}`}>
                        {initial}
                      </div>

                      {/* Safe Username */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            className="label-lg"
                            style={{
                              color: item.is_current_user ? 'var(--on-secondary-container)' : 'var(--on-surface)',
                              fontWeight: item.is_current_user ? '700' : '600',
                            }}
                          >
                            @{item.username}
                          </span>
                          {item.is_current_user && (
                            <span className="badge-you">YOU</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Streak Value */}
                    <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                      <div
                        className={`streak-pill ${
                          item.is_current_user ? 'streak-pill-current-user' : ''
                        }`}
                        style={!item.is_current_user ? { backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)' } : {}}
                      >
                        <span className="material-symbols-outlined" style={!item.is_current_user ? { color: 'var(--secondary)' } : {}}>
                          local_fire_department
                        </span>
                        <span>{item.streak} {item.streak === 1 ? 'day' : 'days'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Motivational Footer Callout */}
          <div
            className="card"
            style={{
              marginTop: '12px',
              padding: '16px 18px',
              backgroundColor: 'var(--surface-container)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--primary-container)',
                color: 'var(--on-primary-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lightbulb</span>
            </div>
            <div>
              <p className="label-md" style={{ color: 'var(--on-surface)', marginBottom: '2px' }}>Remember</p>
              <p className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Habits are built with kindness toward yourself, not perfection.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
