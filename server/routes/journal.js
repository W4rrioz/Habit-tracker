import express from 'express';
import { query } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Require authentication for all journal endpoints
router.use(requireAuth);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/journal/:date
 * Returns journal entry for that date (YYYY-MM-DD) for logged-in user.
 */
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;

    if (!DATE_REGEX.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
    }

    const result = await query(
      `SELECT id, user_id, date, content, updated_at
       FROM journal_entries
       WHERE user_id = $1 AND date = $2`,
      [req.user.id, date]
    );

    if (result.rows.length === 0) {
      return res.json({ entry: null });
    }

    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Error fetching journal entry:', err);
    res.status(500).json({ error: 'Internal server error while fetching journal entry.' });
  }
});

/**
 * POST /api/journal/:date
 * Body: { content }
 * Upserts into journal_entries on conflict (user_id, date).
 */
router.post('/:date', async (req, res) => {
  try {
    const { date } = req.params;

    if (!DATE_REGEX.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
    }

    const content = req.body.content !== undefined ? String(req.body.content) : '';

    const result = await query(
      `INSERT INTO journal_entries (user_id, date, content, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, date)
       DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
       RETURNING id, user_id, date, content, updated_at`,
      [req.user.id, date, content]
    );

    res.json({
      success: true,
      entry: result.rows[0],
      message: 'Journal entry saved successfully.'
    });
  } catch (err) {
    console.error('Error saving journal entry:', err);
    res.status(500).json({ error: 'Internal server error while saving journal entry.' });
  }
});

export default router;
