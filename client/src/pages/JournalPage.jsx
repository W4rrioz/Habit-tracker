import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

function formatDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(dateKey) {
  const todayKey = formatDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  const dateObj = parseDateKey(dateKey);
  const formatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  if (dateKey === todayKey) return `Today, ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  if (dateKey === yesterdayKey) return `Yesterday, ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  return formatted;
}

export default function JournalPage() {
  const { user } = useAuth();
  const todayKey = formatDateKey(new Date());

  const [currentDateKey, setCurrentDateKey] = useState(todayKey);
  const [content, setContent] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const PROMPTS = [
    { label: '🌱 What went gently?', text: '🌱 What went gently: ' },
    { label: '☕ A quiet micro-joy', text: '☕ A quiet micro-joy: ' },
    { label: '🌊 Tension let go', text: '🌊 Tension let go: ' },
    { label: '🎯 Focus win', text: '🎯 Focus win: ' },
  ];

  const loadEntry = useCallback(async (dateKey) => {
    setLoading(true);
    setSaveStatus('');
    try {
      const res = await fetch(`/api/journal/${dateKey}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const text = data.content || '';
        setContent(text);
        setLastSavedContent(text);
      } else {
        setContent('');
        setLastSavedContent('');
      }
    } catch (err) {
      console.error('Failed to load entry:', err);
      setContent('');
      setLastSavedContent('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntry(currentDateKey);
  }, [currentDateKey, loadEntry]);

  const saveEntry = async (textToSave = content) => {
    if (textToSave === lastSavedContent) return;
    setIsSaving(true);
    setSaveStatus('');
    try {
      const res = await fetch(`/api/journal/${currentDateKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: textToSave }),
      });
      if (res.ok) {
        setLastSavedContent(textToSave);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevDay = () => {
    if (content !== lastSavedContent) saveEntry(content);
    const d = parseDateKey(currentDateKey);
    d.setDate(d.getDate() - 1);
    setCurrentDateKey(formatDateKey(d));
  };

  const handleNextDay = () => {
    if (content !== lastSavedContent) saveEntry(content);
    const d = parseDateKey(currentDateKey);
    d.setDate(d.getDate() + 1);
    setCurrentDateKey(formatDateKey(d));
  };

  const handleToday = () => {
    if (content !== lastSavedContent) saveEntry(content);
    setCurrentDateKey(todayKey);
  };

  const insertPrompt = (promptText) => {
    const updated = content ? `${content}\n\n${promptText}` : promptText;
    setContent(updated);
  };

  const isToday = currentDateKey === todayKey;

  return (
    <div className="flex flex-col w-full max-w-[560px] mx-auto pb-12">
      {/* Top Title & Ambient Context */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Daily Journal
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>
            <span>A calm space for mindful evening reflections</span>
          </p>
        </div>
      </div>

      {/* Date Switcher Pill Deck */}
      <div className="flex items-center justify-between bg-surface-container-low p-1.5 rounded-full mb-4 shadow-sm">
        <button
          onClick={handlePrevDay}
          className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
          title="Previous Day"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container-lowest text-on-surface text-xs font-semibold shadow-sm hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
            <span>{formatDisplayDate(currentDateKey)}</span>
          </button>
          {!isToday && (
            <button
              onClick={handleToday}
              className="text-[11px] font-bold text-primary hover:underline px-2"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={handleNextDay}
          className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
          title="Next Day"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>

      {/* Prompt Pills */}
      <div className="flex flex-col gap-1.5 mb-4">
        <span className="font-label-sm text-[11px] font-bold text-on-surface-variant px-1 uppercase tracking-wider">
          Reflection Sparks
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => insertPrompt(p.text)}
              className="px-3.5 py-1.5 rounded-full bg-surface-container-lowest hover:bg-surface-container-low text-on-surface text-xs font-medium border border-outline-variant/30 shrink-0 shadow-sm transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reflection Card Surface */}
      <div className="bg-surface-container-lowest rounded-lg p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-on-surface-variant border-b border-outline-variant/15 pb-2">
          <span className="font-medium">Thoughts & Reflections</span>
          <span className="text-[11px]">
            {isSaving ? (
              <span className="text-secondary font-semibold">Saving...</span>
            ) : saveStatus === 'saved' ? (
              <span className="text-secondary font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check</span> Saved
              </span>
            ) : (
              `${content.split(/\s+/).filter(Boolean).length} words`
            )}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-on-surface-variant font-medium">Loading entry...</div>
        ) : (
          <textarea
            className="w-full bg-transparent text-on-surface font-body-md text-sm outline-none resize-none min-h-[240px] leading-relaxed placeholder:text-outline-variant"
            placeholder="Write down your thoughts, reflections, or moments of peace from today..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        )}

        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15">
          <span className="text-[11px] text-on-surface-variant">
            {content === lastSavedContent && content ? '✓ All changes saved' : 'Unsaved edits'}
          </span>
          <button
            onClick={() => saveEntry(content)}
            disabled={isSaving || content === lastSavedContent}
            className="flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary-container disabled:opacity-40 px-5 py-2 rounded-full font-label-md text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>Save Entry</span>
          </button>
        </div>
      </div>
    </div>
  );
}
