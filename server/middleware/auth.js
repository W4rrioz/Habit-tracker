import jwt from 'jsonwebtoken';
import { query } from '../lib/db.js';

export async function requireAuth(req, res, next) {
  try {
    const sessionSecret = process.env.SESSION_SECRET || 'habittrack-dev-secret';

    // Check signed cookie first, then regular cookie, then Authorization Bearer header
    const token = req.signedCookies?.habittrack_session 
      || req.cookies?.habittrack_session
      || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, sessionSecret);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    // Always verify user exists in Supabase users table
    const result = await query('SELECT id, username, is_admin FROM users WHERE id = $1', [payload.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}
