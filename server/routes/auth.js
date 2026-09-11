import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function createSessionToken(user) {
  const secret = process.env.SESSION_SECRET || 'habittrack-dev-secret';
  return jwt.sign(
    { userId: user.id, username: user.username, isAdmin: user.is_admin },
    secret,
    { expiresIn: '7d' }
  );
}

function setSessionCookie(res, token) {
  res.cookie('habittrack_session', token, {
    httpOnly: true,
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
    }

    if (/\s/.test(trimmedUsername)) {
      return res.status(400).json({ error: 'Username must not contain spaces.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existing = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [trimmedUsername]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // If first user, make admin
    const countRes = await query('SELECT COUNT(*) as count FROM users');
    const isFirstUser = parseInt(countRes.rows[0].count, 10) === 0;

    const insertRes = await query(
      `INSERT INTO users (username, password_hash, is_admin)
       VALUES ($1, $2, $3)
       RETURNING id, username, is_admin, created_at`,
      [trimmedUsername, passwordHash, isFirstUser]
    );

    const newUser = insertRes.rows[0];
    const token = createSessionToken(newUser);
    setSessionCookie(res, token);

    res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        is_admin: newUser.is_admin
      },
      token
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error during signup.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const trimmedUsername = username.trim();
    const userRes = await query(
      'SELECT id, username, password_hash, is_admin FROM users WHERE LOWER(username) = LOWER($1)',
      [trimmedUsername]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = userRes.rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = createSessionToken(user);
    setSessionCookie(res, token);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('habittrack_session');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      is_admin: req.user.is_admin
    }
  });
});

export default router;
