import express from 'express';
import { query } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateStreaks, getLast7Days, normalizeDateStr, getTodayDateStr, calculateHabitStats } from '../lib/streaks.js';

const router = express.Router();
router.use(requireAuth);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

// GET /api/habits - returns user habits with streak stats and last 7 days checkin booleans
router.get('/', async (req, res) => {
  try {
    const includeArchived = req.query.include_archived === 'true' || req.query.archived === 'true';
    
    let habitsQuery = `
      SELECT id, user_id, name, target_frequency, is_archived, created_at
      FROM habits
      WHERE user_id = $1
    `;
    if (!includeArchived) {
      habitsQuery += ` AND is_archived = false`;
    }
    habitsQuery += ` ORDER BY created_at ASC`;

    const habitsRes = await query(habitsQuery, [req.user.id]);
    const habits = habitsRes.rows;

    if (habits.length === 0) {
      return res.json([]);
    }

    const habitIds = habits.map(h => h.id);
    const checkinsRes = await query(
      `SELECT habit_id, date
       FROM habit_checkins
       WHERE habit_id = ANY($1::uuid[])
       ORDER BY date ASC`,
      [habitIds]
    );

    // Group checkin dates by habit_id
    const checkinsByHabit = {};
    for (const row of checkinsRes.rows) {
      if (!checkinsByHabit[row.habit_id]) {
        checkinsByHabit[row.habit_id] = [];
      }
      checkinsByHabit[row.habit_id].push(row.date);
    }

    const result = habits.map(h => {
      const dates = checkinsByHabit[h.id] || [];
      const streakStats = calculateStreaks(dates);
      const last7Days = getLast7Days(dates);

      return {
        id: h.id,
        user_id: h.user_id,
        name: h.name,
        target_frequency: h.target_frequency,
        is_archived: h.is_archived,
        created_at: h.created_at,
        current_streak: streakStats.current_streak,
        longest_streak: streakStats.longest_streak,
        currentStreak: streakStats.currentStreak,
        longestStreak: streakStats.longestStreak,
        total_checkins: streakStats.total_checkins,
        totalCheckins: streakStats.totalCheckins,
        is_completed_today: streakStats.is_completed_today,
        isCompletedToday: streakStats.isCompletedToday,
        last_7_days: last7Days,
        last7Days
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching habits:', err);
    res.status(500).json({ error: 'Internal server error while fetching habits.' });
  }
});

// POST /api/habits - creates habit
router.post('/', async (req, res) => {
  try {
    const { name, target_frequency } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Habit name is required.' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Habit name must not exceed 100 characters.' });
    }

    const validFrequencies = ['daily', '3x_week', 'weekly'];
    const frequency = validFrequencies.includes(target_frequency) ? target_frequency : 'daily';

    const insertRes = await query(
      `INSERT INTO habits (user_id, name, target_frequency, is_archived)
       VALUES ($1, $2, $3, false)
       RETURNING id, user_id, name, target_frequency, is_archived, created_at`,
      [req.user.id, trimmedName, frequency]
    );

    const habit = insertRes.rows[0];
    const last7Days = getLast7Days([]);

    res.status(201).json({
      ...habit,
      current_streak: 0,
      longest_streak: 0,
      currentStreak: 0,
      longestStreak: 0,
      total_checkins: 0,
      totalCheckins: 0,
      is_completed_today: false,
      isCompletedToday: false,
      last_7_days: last7Days,
      last7Days
    });
  } catch (err) {
    console.error('Error creating habit:', err);
    res.status(500).json({ error: 'Internal server error while creating habit.' });
  }
});

// GET /api/habits/:id - returns habit with checkin history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const habitRes = await query(
      `SELECT id, user_id, name, target_frequency, is_archived, created_at
       FROM habits
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (habitRes.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const habit = habitRes.rows[0];

    const checkinsRes = await query(
      `SELECT date
       FROM habit_checkins
       WHERE habit_id = $1
       ORDER BY date DESC`,
      [id]
    );

    const dates = checkinsRes.rows.map(r => r.date);
    const streakStats = calculateStreaks(dates);
    const last7Days = getLast7Days(dates);

    res.json({
      habit: {
        ...habit,
        current_streak: streakStats.current_streak,
        longest_streak: streakStats.longest_streak,
        currentStreak: streakStats.currentStreak,
        longestStreak: streakStats.longestStreak,
        total_checkins: streakStats.total_checkins,
        totalCheckins: streakStats.totalCheckins,
        is_completed_today: streakStats.is_completed_today,
        isCompletedToday: streakStats.isCompletedToday
      },
      checkins: dates,
      streaks: streakStats,
      last_7_days: last7Days,
      last7Days
    });
  } catch (err) {
    console.error('Error fetching habit detail:', err);
    res.status(500).json({ error: 'Internal server error while fetching habit.' });
  }
});

// GET /api/habits/:id/stats - returns habit stats, completion ring, day-of-week distribution, and trend
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const habitRes = await query(
      `SELECT id, user_id, name, target_frequency, is_archived, created_at
       FROM habits
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (habitRes.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const habit = habitRes.rows[0];

    const checkinsRes = await query(
      `SELECT date
       FROM habit_checkins
       WHERE habit_id = $1
       ORDER BY date ASC`,
      [id]
    );

    const dates = checkinsRes.rows.map(r => r.date);
    const stats = calculateHabitStats(dates);

    res.json({
      habit_id: habit.id,
      habitId: habit.id,
      name: habit.name,
      target_frequency: habit.target_frequency,
      targetFrequency: habit.target_frequency,
      is_archived: habit.is_archived,
      isArchived: habit.is_archived,
      created_at: habit.created_at,
      createdAt: habit.created_at,
      ...stats
    });
  } catch (err) {
    console.error('Error fetching habit stats:', err);
    res.status(500).json({ error: 'Internal server error while fetching habit stats.' });
  }
});

// PUT /api/habits/:id - updates habit name/target_frequency/is_archived
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const existingRes = await query(
      `SELECT id, user_id, name, target_frequency, is_archived, created_at
       FROM habits
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const existing = existingRes.rows[0];
    const { name, target_frequency, is_archived } = req.body;

    let updatedName = existing.name;
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Habit name cannot be empty.' });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({ error: 'Habit name must not exceed 100 characters.' });
      }
      updatedName = name.trim();
    }

    let updatedFrequency = existing.target_frequency;
    if (target_frequency !== undefined) {
      const validFrequencies = ['daily', '3x_week', 'weekly'];
      if (!validFrequencies.includes(target_frequency)) {
        return res.status(400).json({ error: 'Invalid target frequency. Must be daily, 3x_week, or weekly.' });
      }
      updatedFrequency = target_frequency;
    }

    const updatedArchived = is_archived !== undefined ? Boolean(is_archived) : existing.is_archived;

    const updateRes = await query(
      `UPDATE habits
       SET name = $1, target_frequency = $2, is_archived = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, name, target_frequency, is_archived, created_at`,
      [updatedName, updatedFrequency, updatedArchived, id, req.user.id]
    );

    res.json({
      success: true,
      habit: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error updating habit:', err);
    res.status(500).json({ error: 'Internal server error while updating habit.' });
  }
});

// DELETE /api/habits/:id - archives habit
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const updateRes = await query(
      `UPDATE habits
       SET is_archived = true
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, name, target_frequency, is_archived, created_at`,
      [id, req.user.id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    res.json({
      success: true,
      message: 'Habit archived successfully.',
      habit: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error archiving habit:', err);
    res.status(500).json({ error: 'Internal server error while archiving habit.' });
  }
});

// POST /api/habits/:id/checkin - body { date }. Toggles checkin for that date and returns updated streaks.
router.post('/:id/checkin', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    // Verify habit belongs to user
    const habitRes = await query(
      `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (habitRes.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found.' });
    }

    const targetDate = req.body.date ? normalizeDateStr(req.body.date) : getTodayDateStr();
    if (!targetDate) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
    }

    // Toggle checkin: if exists delete, otherwise insert
    const existingCheckin = await query(
      `SELECT id FROM habit_checkins WHERE habit_id = $1 AND date = $2`,
      [id, targetDate]
    );

    let checked = false;
    if (existingCheckin.rows.length > 0) {
      await query(
        `DELETE FROM habit_checkins WHERE habit_id = $1 AND date = $2`,
        [id, targetDate]
      );
      checked = false;
    } else {
      await query(
        `INSERT INTO habit_checkins (habit_id, date) VALUES ($1, $2)`,
        [id, targetDate]
      );
      checked = true;
    }

    // Fetch updated checkin history to calculate streaks
    const allCheckinsRes = await query(
      `SELECT date FROM habit_checkins WHERE habit_id = $1 ORDER BY date ASC`,
      [id]
    );

    const dates = allCheckinsRes.rows.map(r => r.date);
    const streakStats = calculateStreaks(dates);
    const last7Days = getLast7Days(dates);

    res.json({
      success: true,
      checked,
      date: targetDate,
      habit_id: id,
      habitId: id,
      current_streak: streakStats.current_streak,
      longest_streak: streakStats.longest_streak,
      currentStreak: streakStats.currentStreak,
      longestStreak: streakStats.longestStreak,
      total_checkins: streakStats.total_checkins,
      totalCheckins: streakStats.totalCheckins,
      is_completed_today: streakStats.is_completed_today,
      isCompletedToday: streakStats.isCompletedToday,
      streaks: streakStats,
      last_7_days: last7Days,
      last7Days
    });
  } catch (err) {
    console.error('Error toggling habit checkin:', err);
    res.status(500).json({ error: 'Internal server error while updating checkin.' });
  }
});

export default router;
