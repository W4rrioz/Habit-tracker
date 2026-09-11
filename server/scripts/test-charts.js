import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query } from '../lib/db.js';
import { calculateHabitStats, getShiftedDate, getTodayDateStr } from '../lib/streaks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const TEST_PORT = 3096;
const serverProc = spawn('node', ['server/index.js'], {
  cwd: path.resolve(__dirname, '../../'),
  env: { ...process.env, PORT: String(TEST_PORT) },
  stdio: 'pipe'
});

let cookieJar = '';
let passedTests = 0;
let totalTests = 0;
let testUserId1 = null;
let testUserId2 = null;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('=== STAGE 6 VERIFICATION: CHARTS & STATS SUITE ===');
  console.log('======================================================\n');

  try {
    const authUrl = `http://localhost:${TEST_PORT}/api/auth`;
    const habitsUrl = `http://localhost:${TEST_PORT}/api/habits`;

    const username1 = `chart_user_${Date.now()}`;
    const username2 = `chart_user_2_${Date.now()}`;
    const password = 'Password123!';

    // 1. Auth Protection Check
    console.log('--- 1. Authentication Protection ---');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const unauthRes = await fetch(`${habitsUrl}/${fakeId}/stats`);
    assert(unauthRes.status === 401, 'GET /api/habits/:id/stats rejected when unauthenticated (401)');

    // 2. Register Test User 1
    console.log('\n--- 2. Register Test User 1 ---');
    const signupRes = await fetch(`${authUrl}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username1, password })
    });
    assert(signupRes.status === 201, 'Test user 1 registered successfully');
    const user1Data = await signupRes.json();
    testUserId1 = user1Data.user.id;

    const rawCookie = signupRes.headers.get('set-cookie');
    if (rawCookie) {
      cookieJar = rawCookie.split(';')[0];
    }
    assert(!!cookieJar, 'Session cookie captured for user 1');

    const headers = {
      'Content-Type': 'application/json',
      Cookie: cookieJar
    };

    // 3. Test Brand New Habit & "Not Enough Data Yet" Threshold (< 3 check-ins)
    console.log('\n--- 3. Brand New Habit & Threshold (< 3 check-ins) ---');
    const createHabit1Res = await fetch(habitsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Brand New Habit', target_frequency: 'daily' })
    });
    assert(createHabit1Res.status === 201, 'Brand new habit created');
    const habit1 = await createHabit1Res.json();
    const habit1Id = habit1.id;

    // 3a. 0 check-ins
    const stats0Res = await fetch(`${habitsUrl}/${habit1Id}/stats`, { headers });
    assert(stats0Res.status === 200, 'GET stats for 0 check-ins returned 200');
    const stats0 = await stats0Res.json();
    assert(stats0.total_checkins === 0, 'Total check-ins is 0');
    assert(stats0.has_enough_data === false, 'has_enough_data is false when checkins = 0 (< 3 threshold)');
    assert(stats0.completion_rate_30d === 0, '30-day completion rate is 0%');
    assert(stats0.completion_ring.completed === 0, 'Completion ring completed days is 0');
    assert(stats0.completion_ring.missed === 30, 'Completion ring missed days is 30');
    assert(stats0.daily_trend_30d.length === 30, 'Daily trend array has exactly 30 days');
    assert(stats0.daily_trend_14d.length === 14, 'Daily trend array has exactly 14 days');

    // 3b. Add 1st check-in
    const today = getTodayDateStr();
    const checkin1Res = await fetch(`${habitsUrl}/${habit1Id}/checkin`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ date: today })
    });
    assert(checkin1Res.status === 200, 'Checked in 1st day');

    const stats1Res = await fetch(`${habitsUrl}/${habit1Id}/stats`, { headers });
    const stats1 = await stats1Res.json();
    assert(stats1.total_checkins === 1, 'Total check-ins is now 1');
    assert(stats1.has_enough_data === false, 'has_enough_data remains false (< 3 threshold)');

    // 3c. Add 2nd check-in
    const yesterday = getShiftedDate(today, -1);
    const checkin2Res = await fetch(`${habitsUrl}/${habit1Id}/checkin`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ date: yesterday })
    });
    assert(checkin2Res.status === 200, 'Checked in 2nd day');

    const stats2Res = await fetch(`${habitsUrl}/${habit1Id}/stats`, { headers });
    const stats2 = await stats2Res.json();
    assert(stats2.total_checkins === 2, 'Total check-ins is now 2');
    assert(stats2.has_enough_data === false, 'has_enough_data remains false (< 3 threshold)');

    // 3d. Add 3rd check-in -> threshold met!
    const twoDaysAgo = getShiftedDate(today, -2);
    const checkin3Res = await fetch(`${habitsUrl}/${habit1Id}/checkin`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ date: twoDaysAgo })
    });
    assert(checkin3Res.status === 200, 'Checked in 3rd day');

    const stats3Res = await fetch(`${habitsUrl}/${habit1Id}/stats`, { headers });
    const stats3 = await stats3Res.json();
    assert(stats3.total_checkins === 3, 'Total check-ins is now 3');
    assert(stats3.has_enough_data === true, 'has_enough_data is now true (threshold >= 3 satisfied!)');

    // 4. Test Habit with At Least 20 Days of History & Manual Calculation Verification
    console.log('\n--- 4. Habit with >= 20 Days of History & Manual Calculations ---');
    const createHabit2Res = await fetch(habitsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Long Term Habit', target_frequency: 'daily' })
    });
    assert(createHabit2Res.status === 201, 'Created long term habit');
    const habit2 = await createHabit2Res.json();
    const habit2Id = habit2.id;

    // Construct a rich historical dataset with 22 check-in dates (> 20 days!):
    // - 18 check-ins inside rolling 30-day window
    // - 4 check-ins outside rolling 30-day window
    const offsets30d = [0, -1, -3, -4, -6, -8, -10, -11, -13, -15, -16, -18, -20, -22, -24, -25, -27, -29];
    const offsetsOld = [-35, -40, -45, -50];
    const allOffsets = [...offsets30d, ...offsetsOld]; // 22 check-ins!

    const allDates = allOffsets.map(offset => getShiftedDate(today, offset)).sort();

    // Insert all 22 check-ins directly into database
    for (const d of allDates) {
      await query(
        `INSERT INTO habit_checkins (habit_id, date) VALUES ($1, $2)`,
        [habit2Id, d]
      );
    }

    // Perform Manual Calculations on the Dataset:
    const expectedTotalCheckins = 22; // >= 20 days requirement!
    const expectedCompleted30d = 18;
    const expectedMissed30d = 30 - 18; // 12
    const expectedRate30d = Math.round((18 / 30) * 100); // 60%

    // Manually calculate day of week distribution across all 22 dates
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const expectedDowCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    for (const d of allDates) {
      const [y, m, dayNum] = d.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, dayNum));
      const dayName = dayNames[dateObj.getUTCDay()];
      expectedDowCounts[dayName]++;
    }

    // Call GET /api/habits/:id/stats
    const statsHabit2Res = await fetch(`${habitsUrl}/${habit2Id}/stats`, { headers });
    assert(statsHabit2Res.status === 200, 'GET /api/habits/:id/stats returned 200 for 20+ days habit');
    const statsHabit2 = await statsHabit2Res.json();

    console.log('\n[Manual Calculation vs API Output]');
    console.log(`  Total check-ins: expected=${expectedTotalCheckins}, actual=${statsHabit2.total_checkins}`);
    console.log(`  30-day completed: expected=${expectedCompleted30d}, actual=${statsHabit2.completion_ring.completed}`);
    console.log(`  30-day missed: expected=${expectedMissed30d}, actual=${statsHabit2.completion_ring.missed}`);
    console.log(`  30-day completion rate: expected=${expectedRate30d}%, actual=${statsHabit2.completion_rate_30d}%`);
    console.log(`  Day of week distribution expected:`, expectedDowCounts);
    console.log(`  Day of week distribution actual:  `, statsHabit2.day_of_week_distribution);

    assert(statsHabit2.total_checkins === expectedTotalCheckins, 'total_checkins matches manual calculation (22 check-ins >= 20)');
    assert(statsHabit2.totalCheckins === expectedTotalCheckins, 'camelCase totalCheckins matches manual calculation');
    assert(statsHabit2.completion_ring.completed === expectedCompleted30d, 'completion_ring.completed matches manual calculation (18)');
    assert(statsHabit2.completion_ring.missed === expectedMissed30d, 'completion_ring.missed matches manual calculation (12)');
    assert(statsHabit2.completion_ring.total_days === 30, 'completion_ring.total_days is 30');
    assert(statsHabit2.completion_rate_30d === expectedRate30d, 'completion_rate_30d matches manual calculation (60%)');
    assert(statsHabit2.completion_ring.rate_percentage === expectedRate30d, 'completion_ring.rate_percentage matches (60%)');
    assert(statsHabit2.has_enough_data === true, 'has_enough_data is true for 20+ check-ins');

    // Day of week distribution asserts
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      assert(
        statsHabit2.day_of_week_distribution[day] === expectedDowCounts[day],
        `day_of_week_distribution.${day} matches manual count (${expectedDowCounts[day]})`
      );
    }

    // Daily trend 14d & 30d verification
    assert(statsHabit2.daily_trend_30d.length === 30, 'daily_trend_30d contains exactly 30 days');
    assert(statsHabit2.daily_trend_14d.length === 14, 'daily_trend_14d contains exactly 14 days');
    assert(statsHabit2.daily_trend_30d[29].date === today, 'Last item in 30-day trend is today');
    assert(statsHabit2.daily_trend_30d[29].completed === true, 'Today is marked completed in 30-day trend');

    // 5. Cross-User Access Isolation Check
    console.log('\n--- 5. Cross-User Data Privacy & Scoping ---');
    const signup2Res = await fetch(`${authUrl}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username2, password })
    });
    assert(signup2Res.status === 201, 'Test user 2 registered successfully');
    const user2Data = await signup2Res.json();
    testUserId2 = user2Data.user.id;

    const cookie2 = signup2Res.headers.get('set-cookie').split(';')[0];
    const headersUser2 = {
      'Content-Type': 'application/json',
      Cookie: cookie2
    };

    // User 2 attempts to fetch stats for User 1's habit
    const unauthorizedHabitRes = await fetch(`${habitsUrl}/${habit2Id}/stats`, { headers: headersUser2 });
    assert(unauthorizedHabitRes.status === 404, 'User 2 cannot access stats for User 1 habit (404 Not Found)');

    console.log('\n======================================================');
    console.log(`✅ ALL TESTS PASSED! (${passedTests}/${totalTests} assertions)`);
    console.log('======================================================\n');
  } finally {
    // Clean up test data
    console.log('[Cleanup] Removing test users and habits...');
    try {
      if (testUserId1) {
        await query(`DELETE FROM users WHERE id = $1`, [testUserId1]);
      }
      if (testUserId2) {
        await query(`DELETE FROM users WHERE id = $1`, [testUserId2]);
      }
      console.log('[Cleanup] Database cleaned successfully.');
    } catch (cleanupErr) {
      console.error('[Cleanup Error]', cleanupErr);
    }
  }
}

serverProc.stdout.on('data', async (d) => {
  const str = d.toString();
  if (str.includes('HabitTrack server running')) {
    try {
      await runTests();
    } catch (e) {
      console.error('\nTEST SUITE RUNNER ERROR:', e.message);
      process.exitCode = 1;
    } finally {
      serverProc.kill();
      process.exit(process.exitCode || 0);
    }
  }
});

serverProc.stderr.on('data', (d) => {
  const errStr = d.toString().trim();
  if (errStr && !errStr.includes('ExperimentalWarning')) {
    console.error('[SERVER STDERR]:', errStr);
  }
});

setTimeout(() => {
  console.error('Test timeout after 30 seconds');
  serverProc.kill();
  process.exit(1);
}, 30000);
