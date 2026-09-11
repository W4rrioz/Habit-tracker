import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function FocusTimerPage() {
  const { user } = useAuth();

  // Timer modes in minutes
  const MODES = [
    { label: '25 min', minutes: 25, title: 'Deep Focus' },
    { label: '5 min', minutes: 5, title: 'Short Break' },
    { label: '15 min', minutes: 15, title: 'Long Break' },
  ];

  const [selectedMode, setSelectedMode] = useState(MODES[0]);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');

  // Today's Stats
  const [todayStats, setTodayStats] = useState({ total_sessions: 0, total_minutes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const timerRef = useRef(null);
  const endTimeRef = useRef(null);

  // Play soothing harmonic chime on natural completion
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      // Calm major chord notes
      playTone(523.25, now, 1.2);        // C5
      playTone(659.25, now + 0.18, 1.2); // E5
      playTone(783.99, now + 0.36, 1.8); // G5
    } catch (e) {
      console.warn('AudioContext chime error:', e);
    }
  };

  // Fetch today's stats on mount
  const fetchTodayStats = async () => {
    try {
      const res = await fetch('/api/timer/today', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTodayStats({
          total_sessions: data.total_sessions || 0,
          total_minutes: data.total_minutes || 0
        });
      }
    } catch (err) {
      console.error('Failed to load today timer stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchTodayStats();
  }, []);

  // Handle natural completion: Logs session to backend ONLY on natural completion
  const handleNaturalCompletion = async (durationMins) => {
    setIsRunning(false);
    setIsCompleted(true);
    playChime();
    setCompletionMessage(`Focus session complete! Logged ${durationMins}m to today's progress.`);

    try {
      const res = await fetch('/api/timer/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ duration_minutes: durationMins })
      });

      if (res.ok) {
        // Refetch updated stats from backend
        fetchTodayStats();
      } else {
        console.error('Failed to record session on server');
      }
    } catch (err) {
      console.error('Network error recording session:', err);
    }
  };

  // Timer Tick Engine using timestamp comparison for accuracy
  useEffect(() => {
    if (isRunning) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + remainingSeconds * 1000;
      }

      timerRef.current = setInterval(() => {
        const secondsLeft = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setRemainingSeconds(secondsLeft);

        if (secondsLeft <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          endTimeRef.current = null;
          handleNaturalCompletion(selectedMode.minutes);
        }
      }, 250);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      endTimeRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, selectedMode.minutes]);

  // Toggle Start / Pause
  const toggleTimer = () => {
    if (isCompleted) {
      // If completed, start fresh session
      setIsCompleted(false);
      setCompletionMessage('');
      setRemainingSeconds(selectedMode.minutes * 60);
      endTimeRef.current = Date.now() + selectedMode.minutes * 60 * 1000;
      setIsRunning(true);
      return;
    }

    if (!isRunning) {
      // Resume / Start
      endTimeRef.current = Date.now() + remainingSeconds * 1000;
      setIsRunning(true);
    } else {
      // Pause
      setIsRunning(false);
      endTimeRef.current = null;
    }
  };

  // Manual Reset: Pauses and resets countdown. Does NOT call POST /api/timer/session.
  const handleReset = () => {
    setIsRunning(false);
    endTimeRef.current = null;
    setIsCompleted(false);
    setCompletionMessage('');
    const secs = selectedMode.minutes * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
  };

  // Change Timer Mode (25m / 5m / 15m)
  const handleModeChange = (mode) => {
    setIsRunning(false);
    endTimeRef.current = null;
    setIsCompleted(false);
    setCompletionMessage('');
    setSelectedMode(mode);
    const secs = mode.minutes * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
  };

  // Calculate SVG circular ring progress
  const radius = 120;
  const circumference = 2 * Math.PI * radius; // ~753.98
  const progressRatio = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const displayMinutes = Math.floor(remainingSeconds / 60);
  const displaySeconds = remainingSeconds % 60;
  const formattedTime = `${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Zen Ambient Pill */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--surface-container-low)',
          padding: '6px 16px',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isRunning ? 'var(--secondary)' : 'var(--outline)',
            boxShadow: isRunning ? '0 0 8px var(--secondary)' : 'none',
            transition: 'all 0.3s ease'
          }} />
          <span className="label-sm" style={{ color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isRunning ? 'Deep Flow State' : isCompleted ? 'Session Finished' : 'Mindful Focus'}
          </span>
        </div>
      </div>

      {/* Main Focus Dial Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px', position: 'relative' }}>
        
        {/* Soft Circular Glow */}
        <div style={{
          position: 'absolute',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          backgroundColor: isRunning ? 'rgba(0, 106, 97, 0.08)' : 'rgba(0, 97, 148, 0.04)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* Circular SVG Ring */}
        <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <svg
            width="280"
            height="280"
            viewBox="0 0 280 280"
            style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}
          >
            {/* Background Track */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="transparent"
              stroke="var(--surface-container-high)"
              strokeWidth="12"
            />
            {/* Animated Active Arc */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="transparent"
              stroke="var(--secondary)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: isRunning ? 'stroke-dashoffset 0.3s linear, stroke 0.3s ease' : 'stroke-dashoffset 0.2s ease',
              }}
            />
          </svg>

          {/* Center Digital Display */}
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', userSelect: 'none' }}>
            <span
              style={{
                fontSize: '48px',
                fontWeight: '700',
                letterSpacing: '-0.02em',
                color: 'var(--on-surface)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {formattedTime}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: 'var(--secondary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {isCompleted ? 'task_alt' : 'self_improvement'}
              </span>
              <span className="label-md" style={{ color: 'var(--on-surface-variant)' }}>
                {selectedMode.title}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Switcher Buttons */}
        <div style={{
          display: 'flex',
          gap: '6px',
          marginTop: '24px',
          padding: '4px',
          backgroundColor: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-full)',
          zIndex: 1
        }}>
          {MODES.map((mode) => {
            const isSelected = selectedMode.minutes === mode.minutes;
            return (
              <button
                key={mode.minutes}
                onClick={() => handleModeChange(mode)}
                disabled={isRunning}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  backgroundColor: isSelected ? 'var(--secondary-container)' : 'transparent',
                  color: isSelected ? 'var(--on-secondary-container)' : 'var(--on-surface-variant)',
                  boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                  opacity: isRunning && !isSelected ? 0.6 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Completion Celebration Message */}
        {completionMessage && (
          <div style={{
            marginTop: '16px',
            padding: '10px 18px',
            backgroundColor: 'var(--secondary-fixed)',
            color: 'var(--on-secondary-fixed)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.3s ease',
            zIndex: 1
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>celebration</span>
            <span>{completionMessage}</span>
          </div>
        )}

        {/* Primary Action Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '24px',
          width: '100%',
          maxWidth: '340px',
          zIndex: 1
        }}>
          {/* Manual Reset Button (does NOT log session) */}
          <button
            onClick={handleReset}
            className="btn-secondary"
            style={{
              flex: 1,
              height: '46px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            title="Reset timer without logging"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>refresh</span>
            <span>Reset</span>
          </button>

          {/* Toggle Start / Pause */}
          <button
            onClick={toggleTimer}
            className="btn-primary"
            style={{
              flex: 1.5,
              height: '46px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: isRunning ? 'var(--secondary)' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              {isRunning ? 'pause' : isCompleted ? 'replay' : 'play_arrow'}
            </span>
            <span>{isRunning ? 'Pause' : isCompleted ? 'New Session' : remainingSeconds < totalSeconds ? 'Resume' : 'Start Focus'}</span>
          </button>
        </div>
      </div>

      {/* Today's Stats Card */}
      <div className="card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: 'var(--surface-container-low)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--secondary-container)',
            color: 'var(--on-secondary-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>task_alt</span>
          </div>
          <div>
            <div className="label-lg" style={{ color: 'var(--on-surface)' }}>
              {todayStats.total_sessions} {todayStats.total_sessions === 1 ? 'session' : 'sessions'} completed today
            </div>
            <div className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
              Deep work logged upon natural countdown completion
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span className="headline-sm" style={{ color: 'var(--secondary)', fontWeight: '700' }}>
            {todayStats.total_minutes}m
          </span>
          <div className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>
            focused
          </div>
        </div>
      </div>

    </div>
  );
}
