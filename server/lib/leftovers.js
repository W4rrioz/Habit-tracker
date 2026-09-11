import { query } from './db.js';

/**
 * Format a Date object or date string to 'YYYY-MM-DD'
 */
export function formatDate(date) {
  if (!date) return null;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the period_start ('YYYY-MM-DD') for the CURRENT period of a given recurrence.
 * Rule: Weeks start on Monday.
 */
export function getCurrentPeriodStart(recurrence, referenceDate = new Date()) {
  const d = new Date(referenceDate);
  if (recurrence === 'daily') {
    return formatDate(d);
  } else if (recurrence === 'weekly') {
    // getDay: 0 = Sun, 1 = Mon, ..., 6 = Sat
    // For Monday-start week: Mon=0, Tue=1, ..., Sun=6
    const dayOfWeek = (d.getDay() + 6) % 7;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek);
    return formatDate(monday);
  } else if (recurrence === 'monthly') {
    const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    return formatDate(firstOfMonth);
  }
  return null;
}

/**
 * Returns the period_start ('YYYY-MM-DD') for the MOST RECENTLY ENDED period of a given recurrence.
 * - daily: yesterday
 * - weekly: last Monday (for the previous Monday-Sunday week)
 * - monthly: 1st of last month
 */
export function getLastEndedPeriodStart(recurrence, referenceDate = new Date()) {
  const d = new Date(referenceDate);
  if (recurrence === 'daily') {
    const yesterday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    return formatDate(yesterday);
  } else if (recurrence === 'weekly') {
    const dayOfWeek = (d.getDay() + 6) % 7;
    // Current week's Monday is d.getDate() - dayOfWeek
    // Last week's Monday is d.getDate() - dayOfWeek - 7
    const lastMonday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek - 7);
    return formatDate(lastMonday);
  } else if (recurrence === 'monthly') {
    const lastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return formatDate(lastMonth);
  }
  return null;
}

/**
 * GetLeftovers(userId, referenceDate):
 * For each active recurring todo (daily, weekly, monthly), check if completed
 * in the most recently ended period (yesterday for daily, last Monday-Sunday for weekly,
 * last month for monthly). If not completed in todo_completions, return as leftover.
 */
export async function GetLeftovers(userId, referenceDate = new Date()) {
  const dailyPeriod = getLastEndedPeriodStart('daily', referenceDate);
  const weeklyPeriod = getLastEndedPeriodStart('weekly', referenceDate);
  const monthlyPeriod = getLastEndedPeriodStart('monthly', referenceDate);

  const sql = `
    SELECT 
      t.id,
      t.user_id,
      t.title,
      t.due_date,
      t.priority,
      t.recurrence,
      t.is_completed,
      t.created_at,
      CASE 
        WHEN t.recurrence = 'daily' THEN $2::date
        WHEN t.recurrence = 'weekly' THEN $3::date
        WHEN t.recurrence = 'monthly' THEN $4::date
      END AS leftover_period_start
    FROM todos t
    LEFT JOIN todo_completions tc 
      ON tc.todo_id = t.id 
      AND tc.period_start = (
        CASE 
          WHEN t.recurrence = 'daily' THEN $2::date
          WHEN t.recurrence = 'weekly' THEN $3::date
          WHEN t.recurrence = 'monthly' THEN $4::date
        END
      )
    WHERE t.user_id = $1
      AND t.recurrence IN ('daily', 'weekly', 'monthly')
      AND tc.id IS NULL
    ORDER BY 
      CASE t.priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
      END,
      t.created_at ASC;
  `;

  const result = await query(sql, [userId, dailyPeriod, weeklyPeriod, monthlyPeriod]);

  return result.rows.map(row => ({
    ...row,
    due_date: formatDate(row.due_date),
    leftover_period_start: formatDate(row.leftover_period_start),
    leftover_period_type: row.recurrence,
    is_leftover: true
  }));
}

export default GetLeftovers;
