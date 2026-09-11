import express from 'express';
import { query } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateStreaks } from '../lib/streaks.js';

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/leaderboard?metric=current|longest
 * 
 * Aggregates across all users with active habits (is_archived = false).
 * Computes each user's best streak (current or longest) across their active habits.
 * 
 * PRIVACY SAFE:
 * Exposes username + streak value ONLY.
 * NEVER exposes habit names, user ids, emails, or photos.
 */
router.get('/', async (req, res) => {
  try {
    const metric = req.query.metric === 'longest' ? 'longest' : 'current';
    const currentUserId = req.user?.id;

    // 1. Fetch active habits (is_archived = false) with their owner's username
    const habitsRes = await query(`
      SELECT h.id as habit_id, h.user_id, u.username
      FROM habits h
      JOIN users u ON u.id = h.user_id
      WHERE h.is_archived = false
    `);

    const activeHabits = habitsRes.rows;

    if (activeHabits.length === 0) {
      return res.json([]);
    }

    const habitIds = activeHabits.map(h => h.habit_id);

    // 2. Fetch all check-in dates for these active habits
    const checkinsRes = await query(`
      SELECT habit_id, date
      FROM habit_checkins
      WHERE habit_id = ANY($1::uuid[])
      ORDER BY date ASC
    `, [habitIds]);

    // Group check-in dates by habit_id
    const checkinsByHabit = {};
    for (const row of checkinsRes.rows) {
      if (!checkinsByHabit[row.habit_id]) {
        checkinsByHabit[row.habit_id] = [];
      }
      checkinsByHabit[row.habit_id].push(row.date);
    }

    // 3. Calculate streak for each habit and find each user's best streak
    // Map of user_id -> { username, streak, is_current_user }
    const userMap = new Map();

    for (const h of activeHabits) {
      const dates = checkinsByHabit[h.habit_id] || [];
      const streakStats = calculateStreaks(dates);
      const streakValue = metric === 'longest'
        ? streakStats.longestStreak
        : streakStats.currentStreak;

      if (!userMap.has(h.user_id)) {
        userMap.set(h.user_id, {
          username: h.username,
          streak: streakValue,
          is_current_user: h.user_id === currentUserId
        });
      } else {
        const existing = userMap.get(h.user_id);
        if (streakValue > existing.streak) {
          existing.streak = streakValue;
        }
      }
    }

    // 4. Sort users descending by best streak; tie-break by username ascending
    const userList = Array.from(userMap.values());
    userList.sort((a, b) => {
      if (b.streak !== a.streak) {
        return b.streak - a.streak;
      }
      return a.username.localeCompare(b.username);
    });

    // 5. Format ranked output strictly containing only non-private leaderboard fields
    const rankedLeaderboard = userList.map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      streak: entry.streak,
      is_current_user: entry.is_current_user
    }));

    res.json(rankedLeaderboard);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Internal server error while fetching leaderboard.' });
  }
});

export default router;
