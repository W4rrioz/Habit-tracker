import express from 'express';
import { query } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Require authentication for all timer endpoints
router.use(requireAuth);

/**
 * POST /api/timer/session
 * Body: { duration_minutes }
 * Logs session ONLY upon natural completion.
 */
router.post('/session', async (req, res) => {
  try {
    const rawDuration = req.body.duration_minutes !== undefined
      ? req.body.duration_minutes
      : 25;

    const duration = parseInt(rawDuration, 10);
    if (isNaN(duration) || duration <= 0 || duration > 1440) {
      return res.status(400).json({ error: 'Duration must be a positive number of minutes (1-1440).' });
    }

    const insertRes = await query(
      `INSERT INTO timer_sessions (user_id, duration_minutes, completed_at)
       VALUES ($1, $2, NOW())
       RETURNING id, user_id, duration_minutes, completed_at`,
      [req.user.id, duration]
    );

    res.status(201).json({
      success: true,
      session: insertRes.rows[0],
      message: 'Timer session logged successfully.'
    });
  } catch (err) {
    console.error('Error logging timer session:', err);
    res.status(500).json({ error: 'Internal server error while logging timer session.' });
  }
});

/**
 * GET /api/timer/today
 * Query: ?date=YYYY-MM-DD (optional, defaults to CURRENT_DATE)
 * Returns today's total sessions and focus minutes for logged-in user.
 */
router.get('/today', async (req, res) => {
  try {
    const targetDate = req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : null;

    let queryText = `
      SELECT 
        COUNT(*)::int AS total_sessions,
        COALESCE(SUM(duration_minutes), 0)::int AS total_minutes
      FROM timer_sessions
      WHERE user_id = $1
    `;
    const params = [req.user.id];

    if (targetDate) {
      queryText += ` AND completed_at::date = $2::date`;
      params.push(targetDate);
    } else {
      queryText += ` AND completed_at::date = CURRENT_DATE`;
    }

    const result = await query(queryText, params);
    const stats = result.rows[0] || { total_sessions: 0, total_minutes: 0 };

    res.json({
      total_sessions: stats.total_sessions,
      total_minutes: stats.total_minutes,
      totalSessions: stats.total_sessions,
      totalMinutes: stats.total_minutes
    });
  } catch (err) {
    console.error('Error fetching today timer stats:', err);
    res.status(500).json({ error: 'Internal server error while fetching timer stats.' });
  }
});

export default router;
