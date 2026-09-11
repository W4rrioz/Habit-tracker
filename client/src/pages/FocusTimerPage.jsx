import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function FocusTimerPage() {
  const { user } = useAuth();

  const MODES = [
    { label: '25 min', minutes: 25, title: 'Deep Flow State' },
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

      playTone(523.25, now, 1.2);        // C5
      playTone(659.25, now + 0.18, 1.2); // E5
      playTone(783.99, now + 0.36, 1.8); // G5
    } catch (e) {
      console.warn('AudioContext chime error:', e);
    }
  };

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
      console.error('Failed to load timer stats:', err);
    }
  };

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const handleNaturalCompletion = async () => {
    setIsRunning(false);
    setIsCompleted(true);
    setCompletionMessage(`Mindful focus complete! Logged ${selectedMode.minutes} minutes.`);
    playChime();

    try {
      const res = await fetch('/api/timer/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ duration_minutes: selectedMode.minutes }),
      });
      if (res.ok) {
        fetchTodayStats();
      }
    } catch (err) {
      console.error('Error logging timer session:', err);
    }
  };

  useEffect(() => {
    if (isRunning) {
      endTimeRef.current = Date.now() + remainingSeconds * 1000;
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.round((endTimeRef.current - now) / 1000);
        if (diff <= 0) {
          clearInterval(timerRef.current);
          setRemainingSeconds(0);
          handleNaturalCompletion();
        } else {
          setRemainingSeconds(diff);
        }
      }, 250);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const switchMode = (mode) => {
    setIsRunning(false);
    setIsCompleted(false);
    setCompletionMessage('');
    setSelectedMode(mode);
    setTotalSeconds(mode.minutes * 60);
    setRemainingSeconds(mode.minutes * 60);
  };

  const toggleTimer = () => {
    if (isCompleted) {
      setRemainingSeconds(totalSeconds);
      setIsCompleted(false);
      setCompletionMessage('');
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setCompletionMessage('');
    setRemainingSeconds(totalSeconds);
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const radius = 120;
  const circumference = 2 * Math.PI * radius; // 753.98
  const progressRatio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="flex flex-col w-full max-w-[480px] mx-auto px-4 py-4 items-center justify-between min-h-[calc(100vh-10rem)]">
      {/* Subtle Ambient Zen Pill */}
      <div className="w-full flex justify-center pt-2">
        <div className="inline-flex items-center gap-2 bg-surface-container-low px-4 py-1.5 rounded-full shadow-sm">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-secondary animate-pulse' : 'bg-outline'}`}></span>
          <span className="font-label-sm text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            {selectedMode.title}
          </span>
        </div>
      </div>

      {completionMessage && (
        <div className="mt-3 px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-xs font-medium shadow-sm animate-bounce">
          {completionMessage}
        </div>
      )}

      {/* Central Focus Stage: Dial & Countdown */}
      <div className="w-full flex flex-col items-center justify-center my-auto py-6">
        <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80">
          {/* Gentle ambient backdrop halo */}
          <div className="absolute inset-4 rounded-full bg-secondary-container/25 blur-2xl pointer-events-none"></div>

          {/* Circular SVG Progress Ring */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 280 280">
            {/* Background Track */}
            <circle
              className="text-surface-container"
              cx="140"
              cy="140"
              fill="transparent"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
            />
            {/* Active Progress Arc */}
            <circle
              className="text-secondary transition-all duration-300 ease-linear"
              cx="140"
              cy="140"
              fill="transparent"
              r={radius}
              stroke="currentColor"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              strokeWidth="12"
            />
          </svg>

          {/* Central Countdown Numerals */}
          <div className="absolute flex flex-col items-center justify-center text-center select-none">
            <span className="font-headline-lg text-5xl sm:text-6xl text-on-surface tracking-tight font-bold py-1">
              {formattedTime}
            </span>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="material-symbols-outlined text-secondary text-[18px]">self_improvement</span>
              <span className="font-label-md text-xs font-medium text-on-surface-variant tracking-wide">
                {isRunning ? 'In Flow' : isCompleted ? 'Session Complete' : 'Ready to Start'}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Switchers / Subtle Duration Dots */}
        <div className="flex items-center gap-1 mt-6 p-1 bg-surface-container-lowest rounded-full shadow-sm">
          {MODES.map((mode) => (
            <button
              key={mode.label}
              onClick={() => switchMode(mode)}
              className={`px-4 py-1.5 rounded-full font-label-md text-xs font-semibold transition-all ${
                selectedMode.label === mode.label
                  ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Control Deck & Session Stats */}
      <div className="w-full flex flex-col items-center gap-5 pb-2">
        {/* Action Pill Button Group */}
        <div className="w-full flex items-center justify-center gap-3 px-2">
          {/* Reset Button */}
          <button
            aria-label="Reset Timer"
            onClick={resetTimer}
            className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface active:scale-95 transition-all font-label-lg text-sm font-semibold shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            <span>Reset</span>
          </button>

          {/* Primary Start/Pause Button */}
          <button
            aria-label="Toggle Timer"
            onClick={toggleTimer}
            className="flex-[1.4] flex items-center justify-center gap-2 h-12 rounded-full bg-primary-container text-on-primary-container shadow-md hover:opacity-95 active:scale-95 transition-all font-label-lg text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isRunning ? 'pause' : 'play_arrow'}
            </span>
            <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
          </button>
        </div>

        {/* Today's Stats Footer */}
        <div className="flex items-center justify-center gap-6 py-2 px-6 bg-surface-container-low/70 rounded-full text-xs font-medium text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-secondary">check_circle</span>
            <span><strong>{todayStats.total_sessions}</strong> sessions today</span>
          </div>
          <span className="text-outline-variant">•</span>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">schedule</span>
            <span><strong>{todayStats.total_minutes}</strong> mins focused</span>
          </div>
        </div>
      </div>
    </div>
  );
}
