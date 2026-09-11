import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../lib/db.js';

const router = express.Router();

// Enforce session authentication
router.use(requireAuth);

// Middleware enforcing server-side check: req.user.is_admin === true
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.is_admin !== true) {
    return res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }
  next();
}

// Protect all admin endpoints
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Returns list of all registered users with:
 * id, username, is_admin, created_at, total_habits, total_todos.
 * Note: password_hash is strictly excluded for security.
 */
router.get('/users', async (req, res) => {
  try {
    const usersQuery = `
      SELECT 
        u.id,
        u.username,
        u.is_admin,
        u.created_at,
        COALESCE(h.total_habits, 0)::int AS total_habits,
        COALESCE(t.total_todos, 0)::int AS total_todos
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS total_habits
        FROM habits
        GROUP BY user_id
      ) h ON u.id = h.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS total_todos
        FROM todos
        GROUP BY user_id
      ) t ON u.id = t.user_id
      ORDER BY u.created_at ASC
    `;

    const result = await query(usersQuery);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ error: 'Failed to fetch users list.' });
  }
});

export default router;
