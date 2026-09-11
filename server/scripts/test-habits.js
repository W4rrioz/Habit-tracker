import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, query } from '../lib/db.js';
import { calculateStreaks, getLast7Days, getShiftedDate, getTodayDateStr } from '../lib/streaks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('Starting HabitTrack Stage 2 Habits & Streak Tests...');
  console.log('====================================================');

  const testUsername = `test_habit_${Date.now()}`;
  const passwordHash = await bcrypt.hash('secret123', 10);

  // 1. Create a clean test user
  console.log('\n[Setup] Creating test user:', testUsername);
  const userRes = await query(
    `INSERT INTO users (username, password_hash, is_admin)
     VALUES ($1, $2, false)
     RETURNING id, username`,
    [testUsername, passwordHash]
  );
  const testUser = userRes.rows[0];
  const userId = testUser.id;
  console.log(`Test user created with ID: ${userId}`);

  try {
    const today = getTodayDateStr();
    const yesterday = getShiftedDate(today, -1);
    const twoDaysAgo = getShiftedDate(today, -2);
    const threeDaysAgo = getShiftedDate(today, -3);
    const fourDaysAgo = getShiftedDate(today, -4);
    const fiveDaysAgo = getShiftedDate(today, -5);

    // ==========================================
    // SCENARIO 1: Perfect Streak
    // ==========================================
    console.log('\n--- Scenario 1: Perfect Streak (5 consecutive days ending today) ---');
    
    // Create habit
    const h1Res = await query(
      `INSERT INTO habits (user_id, name, target_frequency, is_archived)
       VALUES ($1, $2, 'daily', false)
       RETURNING *`,
      [userId, 'Morning Meditation']
    );
    const habit1 = h1Res.rows[0];
    assert(habit1.name === 'Morning Meditation', 'Habit 1 created successfully');
    assert(habit1.is_archived === false, 'Habit 1 is active');

    // Insert 5 consecutive days: 4 days ago, 3 days ago, 2 days ago, yesterday, today
    const scenario1Dates = [fourDaysAgo, threeDaysAgo, twoDaysAgo, yesterday, today];
    for (const d of scenario1Dates) {
      await query(
        `INSERT INTO habit_checkins (habit_id, date) VALUES ($1, $2)`,
        [habit1.id, d]
      );
    }

    const h1CheckinsRes = await query(
      `SELECT date FROM habit_checkins WHERE habit_id = $1 ORDER BY date ASC`,
      [habit1.id]
    );
    const h1Dates = h1CheckinsRes.rows.map(r => r.date);
    const h1Streaks = calculateStreaks(h1Dates, today);
    const h1Last7 = getLast7Days(h1Dates, today);

    console.log('Scenario 1 streaks:', h1Streaks);
    assert(h1Streaks.currentStreak === 5, 'Current streak is exactly 5');
    assert(h1Streaks.longestStreak === 5, 'Longest streak is exactly 5');
    assert(h1Streaks.isCompletedToday === true, 'Habit 1 is marked completed today');
    assert(h1Last7.length === 7, 'Last 7 days history contains 7 items');
    assert(h1Last7[6].completed === true, 'Today in 7-day grid is completed');
    assert(h1Last7[5].completed === true, 'Yesterday in 7-day grid is completed');

    // ==========================================
    // SCENARIO 2: Broken Streak & Boundary Handling
    // ==========================================
    console.log('\n--- Scenario 2: Broken Streak & Yesterday Boundary Handling ---');
    
    // Create habit
    const h2Res = await query(
      `INSERT INTO habits (user_id, name, target_frequency, is_archived)
       VALUES ($1, $2, 'daily', false)
       RETURNING *`,
      [userId, 'Read 20 Pages']
    );
    const habit2 = h2Res.rows[0];

    // Part A: 4 consecutive checkins in past (5, 4, 3, 2 days ago), but neither yesterday nor today
    const past4Dates = [fiveDaysAgo, fourDaysAgo, threeDaysAgo, twoDaysAgo];
    for (const d of past4Dates) {
      await query(
        `INSERT INTO habit_checkins (habit_id, date) VALUES ($1, $2)`,
        [habit2.id, d]
      );
    }

    let h2CheckinsRes = await query(
      `SELECT date FROM habit_checkins WHERE habit_id = $1 ORDER BY date ASC`,
      [habit2.id]
    );
    let h2Dates = h2CheckinsRes.rows.map(r => r.date);
    let h2Streaks = calculateStreaks(h2Dates, today);

    console.log('Scenario 2A (broken streak):', h2Streaks);
    assert(h2Streaks.currentStreak === 0, 'Current streak is broken (0) because neither yesterday nor today was completed');
    assert(h2Streaks.longestStreak === 4, 'Longest streak retains historical run of 4');
    assert(h2Streaks.isCompletedToday === false, 'Not completed today');

    // Part B: Boundary test - user checks in yesterday, but has not yet checked in today
    // Current streak should NOT be broken; today is still in progress!
    console.log('Testing boundary: checking in yesterday (today still pending)...');
    await query(
      `INSERT INTO habit_checkins (habit_id, date) VALUES ($1, $2)`,
      [habit2.id, yesterday]
    );
    // Now check-ins are: -5, -4, -3, -2, -1 (5 consecutive days ending yesterday)
    h2CheckinsRes = await query(
      `SELECT date FROM habit_checkins WHERE habit_id = $1 ORDER BY date ASC`,
      [habit2.id]
    );
    h2Dates = h2CheckinsRes.rows.map(r => r.date);
    h2Streaks = calculateStreaks(h2Dates, today);

    console.log('Scenario 2B (yesterday checked, today pending):', h2Streaks);
    assert(h2Streaks.currentStreak === 5, 'Current streak is 5 (unbroken because yesterday was completed)');
    assert(h2Streaks.longestStreak === 5, 'Longest streak updated to 5');
    assert(h2Streaks.isCompletedToday === false, 'Today is not yet checked in');

    // ==========================================
    // SCENARIO 3: Same-Day Toggle (Toggle Checkin)
    // ==========================================
    console.log('\n--- Scenario 3: Same-Day Toggle (Check-in Toggle & Recalculation) ---');
    
    // Create habit
    const h3Res = await query(
      `INSERT INTO habits (user_id, name, target_frequency, is_archived)
       VALUES ($1, $2, '3x_week', false)
       RETURNING *`,
      [userId, 'Drink 2L Water']
    );
    const habit3 = h3Res.rows[0];

    // Helper toggle function matching POST /api/habits/:id/checkin logic
    async function toggleCheckin(habitId, date) {
      const existing = await query(
        `SELECT id FROM habit_checkins WHERE habit_id = $1 AND date = $2`,
        [habitId, date]
      );
      let checked = false;
      if (existing.rows.length > 0) {
        await query(`DELETE FROM habit_checkins WHERE habit_id = $1 AND date = $2`, [habitId, date]);
        checked = false;
      } else {
        await query(`INSERT INTO habit_checkins (habit_id, date) VALUES ($1, $2)`, [habitId, date]);
        checked = true;
      }
      const all = await query(
        `SELECT date FROM habit_checkins WHERE habit_id = $1 ORDER BY date ASC`,
        [habitId]
      );
      const dates = all.rows.map(r => r.date);
      return { checked, streaks: calculateStreaks(dates, today) };
    }

    // Toggle 1: Check in today
    console.log('Toggle 1: Check in today...');
    const t1 = await toggleCheckin(habit3.id, today);
    assert(t1.checked === true, 'Checked in today successfully');
    assert(t1.streaks.currentStreak === 1, 'Current streak became 1');
    assert(t1.streaks.isCompletedToday === true, 'Completed today flag is true');

    // Toggle 2: Uncheck today
    console.log('Toggle 2: Uncheck today...');
    const t2 = await toggleCheckin(habit3.id, today);
    assert(t2.checked === false, 'Unchecked today successfully');
    assert(t2.streaks.currentStreak === 0, 'Current streak decremented back to 0');
    assert(t2.streaks.isCompletedToday === false, 'Completed today flag is false');

    // Toggle 3: Check in today again
    console.log('Toggle 3: Check in today again...');
    const t3 = await toggleCheckin(habit3.id, today);
    assert(t3.checked === true, 'Checked in today again successfully');
    assert(t3.streaks.currentStreak === 1, 'Current streak restored to 1');

    // ==========================================
    // CRUD & Archiving Verification
    // ==========================================
    console.log('\n--- CRUD & Archiving Verification ---');
    
    // Update habit (PUT)
    const updateRes = await query(
      `UPDATE habits
       SET name = $1, target_frequency = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      ['Hydrate Well (Updated)', 'daily', habit3.id, userId]
    );
    assert(updateRes.rows[0].name === 'Hydrate Well (Updated)', 'Habit name updated via PUT logic');
    assert(updateRes.rows[0].target_frequency === 'daily', 'Habit frequency updated via PUT logic');

    // Archive habit (DELETE)
    const archiveRes = await query(
      `UPDATE habits
       SET is_archived = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [habit3.id, userId]
    );
    assert(archiveRes.rows[0].is_archived === true, 'Habit archived via DELETE logic');

    // Verify active habits query excludes archived
    const activeHabitsRes = await query(
      `SELECT id FROM habits WHERE user_id = $1 AND is_archived = false`,
      [userId]
    );
    const activeIds = activeHabitsRes.rows.map(r => r.id);
    assert(!activeIds.includes(habit3.id), 'Archived habit excluded from active habits list');
    assert(activeIds.includes(habit1.id), 'Active habit 1 included in active list');
    assert(activeIds.includes(habit2.id), 'Active habit 2 included in active list');

    console.log('\n====================================================');
    console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
  } finally {
    // Cleanup test user and data (cascades or delete checkins & habits)
    console.log('[Cleanup] Cleaning up test data for user:', userId);
    await query(`DELETE FROM habit_checkins WHERE habit_id IN (SELECT id FROM habits WHERE user_id = $1)`, [userId]);
    await query(`DELETE FROM habits WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
    console.log('[Cleanup] Cleanup complete.');
    await pool.end();
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
