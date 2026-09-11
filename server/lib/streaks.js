/**
 * Streak calculation logic for HabitTrack
 * Handles:
 * - Current streak:
 *   - Checked in today: counts consecutive days ending today.
 *   - Checked in yesterday but not today: streak is unbroken (today is in progress), counts consecutive days ending yesterday.
 *   - Neither checked in today nor yesterday: streak is 0 (broken).
 * - Longest streak: maximum consecutive checked in days across entire history.
 * - 7-day history: boolean status for the last 7 calendar days up to reference date.
 */

export function normalizeDateStr(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    const match = val.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'object' && val.date) {
    return normalizeDateStr(val.date);
  }
  return null;
}

export function getShiftedDate(dateStr, offsetDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return date.toISOString().slice(0, 10);
}

export function getTodayDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateStreaks(checkinDates = [], referenceDate = null) {
  const refDate = referenceDate ? normalizeDateStr(referenceDate) : getTodayDateStr();
  const yesterday = getShiftedDate(refDate, -1);

  const normalized = checkinDates
    .map(normalizeDateStr)
    .filter(Boolean);

  const uniqueDates = Array.from(new Set(normalized)).sort();
  const dateSet = new Set(uniqueDates);

  // 1. Current streak calculation
  let currentStreak = 0;

  if (dateSet.has(refDate)) {
    // Checked in today
    currentStreak = 1;
    let checkDate = getShiftedDate(refDate, -1);
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getShiftedDate(checkDate, -1);
    }
  } else if (dateSet.has(yesterday)) {
    // Checked in yesterday, today still pending
    currentStreak = 1;
    let checkDate = getShiftedDate(yesterday, -1);
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getShiftedDate(checkDate, -1);
    }
  } else {
    // Broken streak
    currentStreak = 0;
  }

  // 2. Longest streak calculation
  let longestStreak = 0;
  if (uniqueDates.length > 0) {
    let maxStreak = 1;
    let run = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = uniqueDates[i - 1];
      const curr = uniqueDates[i];
      const expectedNext = getShiftedDate(prev, 1);

      if (curr === expectedNext) {
        run++;
        if (run > maxStreak) {
          maxStreak = run;
        }
      } else {
        run = 1;
      }
    }
    longestStreak = Math.max(maxStreak, currentStreak);
  }

  return {
    currentStreak,
    longestStreak,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    totalCheckins: uniqueDates.length,
    total_checkins: uniqueDates.length,
    isCompletedToday: dateSet.has(refDate),
    is_completed_today: dateSet.has(refDate)
  };
}

export function getLast7Days(checkinDates = [], referenceDate = null) {
  const refDate = referenceDate ? normalizeDateStr(referenceDate) : getTodayDateStr();
  const normalized = checkinDates.map(normalizeDateStr).filter(Boolean);
  const dateSet = new Set(normalized);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];

  for (let offset = -6; offset <= 0; offset++) {
    const dateStr = getShiftedDate(refDate, offset);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = dayNames[dateObj.getUTCDay()];

    result.push({
      date: dateStr,
      day: d,
      dayOfWeek,
      isToday: offset === 0,
      completed: dateSet.has(dateStr)
    });
  }

  return result;
}

/**
 * Calculates chart and consistency statistics for a habit.
 * Includes:
 * - total_checkins (lifetime)
 * - 30-day completion rate percentage
 * - completion ring breakdown (completed vs missed days in last 30 days)
 * - day of week distribution (counts for Mon, Tue, Wed, Thu, Fri, Sat, Sun)
 * - daily completion trends for last 14 and 30 days
 * - empty state threshold flag (has_enough_data: total_checkins >= 3)
 */
export function calculateHabitStats(checkinDates = [], referenceDate = null) {
  const refDate = referenceDate ? normalizeDateStr(referenceDate) : getTodayDateStr();
  const normalized = checkinDates.map(normalizeDateStr).filter(Boolean);
  const uniqueDates = Array.from(new Set(normalized)).sort();
  const dateSet = new Set(uniqueDates);

  const totalCheckins = uniqueDates.length;

  // Day of week distribution across all check-ins (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeekDistribution = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0
  };

  for (const dateStr of uniqueDates) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayName = dayNames[dateObj.getUTCDay()];
    if (dayOfWeekDistribution[dayName] !== undefined) {
      dayOfWeekDistribution[dayName]++;
    }
  }

  const dayOfWeekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayOfWeekArray = dayOfWeekOrder.map(day => ({
    day,
    count: dayOfWeekDistribution[day]
  }));

  // 30-day window: offset from -29 to 0 (30 days total)
  const dailyTrend30d = [];
  let completedDays30d = 0;

  for (let offset = -29; offset <= 0; offset++) {
    const dateStr = getShiftedDate(refDate, offset);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = dayNames[dateObj.getUTCDay()];
    const isCompleted = dateSet.has(dateStr);

    if (isCompleted) {
      completedDays30d++;
    }

    dailyTrend30d.push({
      date: dateStr,
      day: d,
      dayOfWeek,
      isToday: offset === 0,
      completed: isCompleted,
      value: isCompleted ? 1 : 0
    });
  }

  // 14-day window: last 14 days of the 30-day array
  const dailyTrend14d = dailyTrend30d.slice(-14);
  const completedDays14d = dailyTrend14d.filter(d => d.completed).length;

  const missedDays30d = 30 - completedDays30d;
  const completionRate30d = Math.round((completedDays30d / 30) * 100);
  const completionRate14d = Math.round((completedDays14d / 14) * 100);

  const completionRing = {
    completed: completedDays30d,
    missed: missedDays30d,
    total_days: 30,
    totalDays: 30,
    rate_percentage: completionRate30d,
    ratePercentage: completionRate30d
  };

  const hasEnoughData = totalCheckins >= 3;

  return {
    total_checkins: totalCheckins,
    totalCheckins,
    completion_rate_30d: completionRate30d,
    completionRate30d,
    completion_rate_14d: completionRate14d,
    completionRate14d,
    completion_rate: completionRate30d,
    completionRate: completionRate30d,
    completion_ring: completionRing,
    completionRing,
    day_of_week_distribution: dayOfWeekDistribution,
    dayOfWeekDistribution,
    day_of_week_array: dayOfWeekArray,
    dayOfWeekArray,
    daily_trend: dailyTrend30d,
    dailyTrend: dailyTrend30d,
    daily_trend_30d: dailyTrend30d,
    dailyTrend30d,
    daily_trend_14d: dailyTrend14d,
    dailyTrend14d,
    has_enough_data: hasEnoughData,
    hasEnoughData,
    threshold: 3
  };
}
