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
    weekday: 'long',
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
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saved' | 'error' | ''

  // Guided reflection prompts
  const PROMPTS = [
    { label: '🌱 What went gently?', text: '🌱 What went gently: ' },
    { label: '☕ A quiet micro-joy', text: '☕ A quiet micro-joy: ' },
    { label: '🌊 Tension let go', text: '🌊 Tension let go: ' },
    { label: '🎯 Focus win', text: '🎯 Focus win: ' },
  ];

  // Fetch journal entry for the selected date
  const loadEntry = useCallback(async (dateKey) => {
    setLoading(true);
    setSaveStatus('');
    try {
      const res = await fetch(`/api/journal/${dateKey}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const loadedText = data.entry ? data.entry.content : '';
        setContent(loadedText);
        setLastSavedContent(loadedText);
        if (data.entry && data.entry.updated_at) {
          const updatedAt = new Date(data.entry.updated_at);
          setLastSavedTime(updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setLastSavedTime(null);
        }
      } else {
        setContent('');
        setLastSavedContent('');
        setLastSavedTime(null);
      }
    } catch (err) {
      console.error('Failed to load journal entry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntry(currentDateKey);
  }, [currentDateKey, loadEntry]);

  // Date Navigation handlers
  const handlePrevDay = () => {
    const d = parseDateKey(currentDateKey);
    d.setDate(d.getDate() - 1);
    setCurrentDateKey(formatDateKey(d));
  };

  const handleNextDay = () => {
    if (currentDateKey >= todayKey) return;
    const d = parseDateKey(currentDateKey);
    d.setDate(d.getDate() + 1);
    setCurrentDateKey(formatDateKey(d));
  };

  const handleGoToday = () => {
    if (currentDateKey !== todayKey) {
      setCurrentDateKey(todayKey);
    }
  };

  // Append a gentle prompt to the textarea
  const handleAppendPrompt = (promptText) => {
    setContent((prev) => {
      let next = prev.trim();
      if (next.length > 0) {
        next += '\n\n';
      }
      return next + promptText;
    });
  };

  // Save entry handler (POST /api/journal/:date)
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('');

    try {
      const res = await fetch(`/api/journal/${currentDateKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        const data = await res.json();
        setLastSavedContent(content);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(timeStr);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Failed to save journal entry:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Word & Character count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const isDirty = content !== lastSavedContent;
  const isFutureOrToday = currentDateKey >= todayKey;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Date Switcher Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--surface-container-low)',
        borderRadius: 'var(--radius-full)',
        padding: '6px 12px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Previous Day Button */}
        <button
          onClick={handlePrevDay}
          className="btn-secondary"
          style={{
            width: '38px',
            height: '38px',
            padding: 0,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            backgroundColor: 'var(--surface-container)'
          }}
          aria-label="Previous day"
          title="Previous day"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_left</span>
        </button>

        {/* Current Date Label & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="headline-sm" style={{ color: 'var(--on-surface)', fontWeight: '700' }}>
              {formatDisplayDate(currentDateKey)}
            </span>
            {currentDateKey !== todayKey && (
              <button
                onClick={handleGoToday}
                className="label-sm"
                style={{
                  border: 'none',
                  backgroundColor: 'var(--secondary-container)',
                  color: 'var(--on-secondary-container)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Today
              </button>
            )}
          </div>
          <span className="label-sm" style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--secondary)' }} />
            {lastSavedTime ? `Saved at ${lastSavedTime}` : isDirty ? 'Unsaved changes' : 'Ready to reflect'}
          </span>
        </div>

        {/* Next Day Button */}
        <button
          onClick={handleNextDay}
          disabled={isFutureOrToday}
          className="btn-secondary"
          style={{
            width: '38px',
            height: '38px',
            padding: 0,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            backgroundColor: 'var(--surface-container)',
            opacity: isFutureOrToday ? 0.35 : 1,
            cursor: isFutureOrToday ? 'not-allowed' : 'pointer'
          }}
          aria-label="Next day"
          title="Next day"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
        </button>
      </div>

      {/* Main Journal Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Reflection Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="headline-md" style={{ color: 'var(--on-surface)' }}>Daily Reflection</h1>
            <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '2px' }}>
              Pause, inhale, and honor small victories and mindful moments.
            </p>
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-fixed)',
            color: 'var(--on-primary-fixed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit_note</span>
          </div>
        </div>

        {/* Textarea Box with Word Counter */}
        <div style={{
          backgroundColor: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          border: isDirty ? '1px solid var(--primary)' : '1px solid var(--surface-container-high)',
          transition: 'border-color 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '260px',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label-sm" style={{ color: 'var(--secondary)', letterSpacing: '0.05em', fontWeight: '700' }}>
              MIND SPACE
            </span>
            <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            placeholder={loading ? 'Loading entry...' : 'How did today go? What brought you quiet peace and focus?'}
            rows={10}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              color: 'var(--on-surface)',
              fontFamily: 'inherit',
              fontSize: '15px',
              lineHeight: '1.6'
            }}
          />

          {/* Prompt Pills Tray */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '8px', borderTop: '1px solid var(--surface-container-high)' }}>
            {PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAppendPrompt(p.text)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--surface-container-lowest)',
                  border: '1px solid var(--surface-container-high)',
                  color: 'var(--on-surface-variant)',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls & Save Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: saveStatus === 'saved' ? 'var(--secondary)' : 'var(--primary)',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {isSaving ? 'sync' : saveStatus === 'saved' ? 'done_all' : 'check'}
            </span>
            <span>
              {isSaving ? 'Saving peaceful note...' : saveStatus === 'saved' ? 'Saved peacefully' : isDirty ? 'Save Entry' : 'Entry Saved'}
            </span>
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: 'var(--on-surface-variant)',
            fontSize: '12px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
            <span>Private & scoped to your account</span>
          </div>
        </div>

      </div>

    </div>
  );
}
