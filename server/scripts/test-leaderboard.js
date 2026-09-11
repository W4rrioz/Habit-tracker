import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from '../lib/db.js';
import { getTodayDateStr, getShiftedDate } from '../lib/streaks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 3097;
const serverProc = spawn('node', ['server/index.js'], {
  cwd: path.resolve(__dirname, '../../'),
  env: { ...process.env, PORT: String(TEST_PORT) },
  stdio: 'pipe'
});

let totalTests = 0;
let passedTests = 0;

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
  const baseUrl = `http://localhost:${TEST_PORT}`;
  const authUrl = `${baseUrl}/api/auth`;
  const leaderboardUrl = `${baseUrl}/api/leaderboard`;

  console.log('\n======================================================');
  console.log('=== STAGE 7 VERIFICATION: LEADERBOARD QA SUITE     ===');
  console.log('======================================================\n');

  // -------------------------------------------------------------
  // Test 1: Authentication Protection
  // -------------------------------------------------------------
  console.log('--- 1. Auth Protection Check ---');
  const unauthRes = await fetch(leaderboardUrl);
  assert(unauthRes.status === 401, 'GET /api/leaderboard is rejected with 401 when unauthenticated');

  // -------------------------------------------------------------
  // Test 2: Create 2 Test Accounts
  // -------------------------------------------------------------
  console.log('\n--- 2. Create Test Accounts ---');
  const userAlphaName = `alpha_tester_${Date.now()}`;
  const userBetaName = `beta_tester_${Date.now()}`;
  const testPassword = 'Password123!';

  // Signup Account Alpha
  const alphaSignupRes = await fetch(`${authUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: userAlphaName, password: testPassword })
  });
  assert(alphaSignupRes.status === 201, `Created Account Alpha (${userAlphaName})`);
  const alphaSignupData = await alphaSignupRes.json();
  const userIdAlpha = alphaSignupData.user.id;
  const cookieAlpha = alphaSignupRes.headers.get('set-cookie')?.split(';')[0];

  // Signup Account Beta
  const betaSignupRes = await fetch(`${authUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: userBetaName, password: testPassword })
  });
  assert(betaSignupRes.status === 201, `Created Account Beta (${userBetaName})`);
  const betaSignupData = await betaSignupRes.json();
  const userIdBeta = betaSignupData.user.id;
  const cookieBeta = betaSignupRes.headers.get('set-cookie')?.split(';')[0];

  // -------------------------------------------------------------
  // Test 3: Seed Habits & Check-ins with Distinct Streaks
  // -------------------------------------------------------------
  console.log('\n--- 3. Seed Test Habits & Check-ins ---');
  const today = getTodayDateStr();

  // Private habit names that MUST NEVER leak into the leaderboard response
  const privateAlphaHabitName = 'Secret Alpha Meditation 101';
  const privateAlphaArchivedName = 'Old Alpha Discarded Routine';
  const privateBetaHabit1Name = 'Private Beta Weightlifting 202';
  const privateBetaHabit2Name = 'Confidential Beta Morning Run';

  // Account Alpha:
  // Active Habit: 7 consecutive days ending today -> current: 7, longest: 7
  const alphaHabitRes = await query(
    `INSERT INTO habits (user_id, name, target_frequency, is_archived)
     VALUES ($1, $2, 'daily', false) RETURNING id`,
    [userIdAlpha, privateAlphaHabitName]
  );
  const alphaHabitId = alphaHabitRes.rows[0].id;

  for (let i = 0; i < 7; i++) {
    await query(
      `INSERT INTO habit_checkins (habit_id, date) VALUES ($1, $2)`,
      [alphaHabitId, getShiftedDate(today, -i)]
    );
  }

  // Account Alpha: Archived Habit with a 25-day past streak -> MUST NOT be counted!
  const alphaArchivedRes = await query(
    `INSERT INTO habits (user_id, name, target_frequency, is_archived)
     VALUES ($1, $2, 'daily', true) RETURNING id`,
    [userIdAlpha, privateAlphaArchivedName]
  );
  const alphaArchivedId = alphaArchivedRes.rows[0].id;

  for (let i = 0; i < 25; i++) {
    await query(
      `INSERT INTO habit_checkins (habit_id, date) VALUES ($1, $2)`,
      [alphaArchivedId, getShiftedDate(today, -30 - i)]
    );
  }

  // Account Beta:
  // Active Habit 1: Broken current streak (ended 5 days ago), but 14-day longest streak
  const betaHabit1Res = await query(
    `INSERT INTO habits (user_id, name, target_frequency, is_archived)
     VALUES ($1, $2, 'daily', false) RETURNING id`,
    [userIdBeta, privateBetaHabit1Name]
  );
  const betaHabit1Id = betaHabit1Res.rows[0].id;

  for (let i = 0; i < 14; i++) {
    await query(
      `INSERT INTO habit_checkins (habit_id, date) VALUES ($1, $2)`,
      [betaHabit1Id, getShiftedDate(today, -5 - i)]
    );
  }

  // Active Habit 2: 4 consecutive days ending today -> current: 4, longest: 4
  const betaHabit2Res = await query(
    `INSERT INTO habits (user_id, name, target_frequency, is_archived)
     VALUES ($1, $2, 'daily', false) RETURNING id`,
    [userIdBeta, privateBetaHabit2Name]
  );
  const betaHabit2Id = betaHabit2Res.rows[0].id;

  for (let i = 0; i < 4; i++) {
    await query(
      `INSERT INTO habit_checkins (habit_id, date) VALUES ($1, $2)`,
      [betaHabit2Id, getShiftedDate(today, -i)]
    );
  }

  console.log('  Seeded Account Alpha: Active current=7, longest=7. Archived streak=25.');
  console.log('  Seeded Account Beta: Habit 1 longest=14 (current=0). Habit 2 current=4, longest=4.');
  console.log('  Expected Current Leader: Alpha (7) > Beta (4).');
  console.log('  Expected Longest Leader: Beta (14) > Alpha (7). (Archived 25 excluded!)');

  // -------------------------------------------------------------
  // Test 4: Verify Ranking for metric=current
  // -------------------------------------------------------------
  console.log('\n--- 4. Verify metric=current Ranking & Current User Identification ---');
  
  // As Alpha user:
  const currentResAlpha = await fetch(`${leaderboardUrl}?metric=current`, {
    headers: { Cookie: cookieAlpha }
  });
  assert(currentResAlpha.status === 200, 'GET /api/leaderboard?metric=current succeeds (200)');
  const currentListAlpha = await currentResAlpha.json();
  assert(Array.isArray(currentListAlpha), 'Returns an array of ranked entries');

  const alphaRowInCurrent = currentListAlpha.find(r => r.username === userAlphaName);
  const betaRowInCurrent = currentListAlpha.find(r => r.username === userBetaName);

  assert(alphaRowInCurrent !== undefined, 'Account Alpha appears in current metric leaderboard');
  assert(betaRowInCurrent !== undefined, 'Account Beta appears in current metric leaderboard');
  assert(alphaRowInCurrent.streak === 7, `Alpha current streak is 7 (actual: ${alphaRowInCurrent.streak})`);
  assert(betaRowInCurrent.streak === 4, `Beta current streak is 4 (actual: ${betaRowInCurrent.streak})`);
  assert(alphaRowInCurrent.rank < betaRowInCurrent.rank, 'Alpha ranks higher than Beta in current streak (7 > 4)');
  assert(alphaRowInCurrent.rank === 1, 'Alpha is Rank 1 in current streak');
  assert(alphaRowInCurrent.is_current_user === true, 'Alpha row has is_current_user: true when logged in as Alpha');
  assert(betaRowInCurrent.is_current_user === false, 'Beta row has is_current_user: false when logged in as Alpha');

  // As Beta user:
  const currentResBeta = await fetch(`${leaderboardUrl}?metric=current`, {
    headers: { Cookie: cookieBeta }
  });
  const currentListBeta = await currentResBeta.json();
  const betaRowInCurrentAsBeta = currentListBeta.find(r => r.username === userBetaName);
  const alphaRowInCurrentAsBeta = currentListBeta.find(r => r.username === userAlphaName);
  assert(betaRowInCurrentAsBeta.is_current_user === true, 'Beta row has is_current_user: true when logged in as Beta');
  assert(alphaRowInCurrentAsBeta.is_current_user === false, 'Alpha row has is_current_user: false when logged in as Beta');

  // -------------------------------------------------------------
  // Test 5: Verify Ranking for metric=longest
  // -------------------------------------------------------------
  console.log('\n--- 5. Verify metric=longest Ranking & Archived Habit Exclusion ---');

  // As Alpha user:
  const longestResAlpha = await fetch(`${leaderboardUrl}?metric=longest`, {
    headers: { Cookie: cookieAlpha }
  });
  assert(longestResAlpha.status === 200, 'GET /api/leaderboard?metric=longest succeeds (200)');
  const longestListAlpha = await longestResAlpha.json();

  const alphaRowInLongest = longestListAlpha.find(r => r.username === userAlphaName);
  const betaRowInLongest = longestListAlpha.find(r => r.username === userBetaName);

  assert(betaRowInLongest.streak === 14, `Beta longest streak is 14 (actual: ${betaRowInLongest.streak})`);
  assert(alphaRowInLongest.streak === 7, `Alpha longest streak is 7, ignoring 25-day archived habit (actual: ${alphaRowInLongest.streak})`);
  assert(betaRowInLongest.rank < alphaRowInLongest.rank, 'Beta ranks higher than Alpha in longest streak (14 > 7)');
  assert(betaRowInLongest.rank === 1, 'Beta is Rank 1 in longest streak');
  assert(alphaRowInLongest.rank === 2, 'Alpha is Rank 2 in longest streak');
  assert(alphaRowInLongest.is_current_user === true, 'Alpha row has is_current_user: true when logged in as Alpha');
  assert(betaRowInLongest.is_current_user === false, 'Beta row has is_current_user: false when logged in as Alpha');

  // As Beta user:
  const longestResBeta = await fetch(`${leaderboardUrl}?metric=longest`, {
    headers: { Cookie: cookieBeta }
  });
  const longestListBeta = await longestResBeta.json();
  const betaRowInLongestAsBeta = longestListBeta.find(r => r.username === userBetaName);
  assert(betaRowInLongestAsBeta.is_current_user === true, 'Beta row has is_current_user: true when logged in as Beta');

  // -------------------------------------------------------------
  // Test 6: MANDATORY PRIVACY AUDIT
  // Assert NO private habit names, user ids, emails, or photos exist
  // -------------------------------------------------------------
  console.log('\n--- 6. MANDATORY PRIVACY AUDIT ---');

  const allowedKeys = ['rank', 'username', 'streak', 'is_current_user'];
  const testResponses = [currentListAlpha, longestListAlpha, currentListBeta, longestListBeta];

  for (const resp of testResponses) {
    for (const entry of resp) {
      const entryKeys = Object.keys(entry);
      for (const k of entryKeys) {
        assert(allowedKeys.includes(k), `Entry key '${k}' is permitted (only rank, username, streak, is_current_user allowed)`);
      }
      assert(entry.id === undefined, 'No id key exposed');
      assert(entry.user_id === undefined, 'No user_id key exposed');
      assert(entry.email === undefined, 'No email key exposed');
      assert(entry.photo === undefined, 'No photo key exposed');
      assert(entry.habit === undefined, 'No habit key exposed');
      assert(entry.habit_name === undefined, 'No habit_name key exposed');
      assert(entry.habits === undefined, 'No habits key exposed');
    }

    const payloadString = JSON.stringify(resp);
    assert(!payloadString.includes(privateAlphaHabitName), `Payload does NOT contain '${privateAlphaHabitName}'`);
    assert(!payloadString.includes(privateAlphaArchivedName), `Payload does NOT contain '${privateAlphaArchivedName}'`);
    assert(!payloadString.includes(privateBetaHabit1Name), `Payload does NOT contain '${privateBetaHabit1Name}'`);
    assert(!payloadString.includes(privateBetaHabit2Name), `Payload does NOT contain '${privateBetaHabit2Name}'`);
    assert(!payloadString.includes(userIdAlpha), `Payload does NOT contain user Alpha's UUID`);
    assert(!payloadString.includes(userIdBeta), `Payload does NOT contain user Beta's UUID`);
  }

  // -------------------------------------------------------------
  // Test Cleanup
  // -------------------------------------------------------------
  console.log('\n--- Cleanup Test Users ---');
  await query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[userIdAlpha, userIdBeta]]);
  console.log('  Cleaned up test users Alpha and Beta.');

  console.log('\n======================================================');
  console.log(`=== ALL LEADERBOARD TESTS PASSED (${passedTests}/${totalTests}) ===`);
  console.log('======================================================\n');
}

// Server lifecycle handling
let isServerReady = false;

serverProc.stdout.on('data', async (d) => {
  const msg = d.toString();
  if (msg.includes('HabitTrack server running') && !isServerReady) {
    isServerReady = true;
    try {
      await runTests();
      serverProc.kill();
      try { await pool.end(); } catch (e) {}
      process.exit(0);
    } catch (err) {
      console.error('\n❌ Test Suite Failed:', err);
      serverProc.kill();
      try { await pool.end(); } catch (e) {}
      process.exit(1);
    }
  }
});

serverProc.stderr.on('data', (d) => {
  console.error('[SERVER STDERR]:', d.toString().trim());
});

const timeout = setTimeout(async () => {
  console.error('\n❌ TIMEOUT waiting for test execution');
  serverProc.kill();
  try { await pool.end(); } catch (e) {}
  process.exit(1);
}, 30000);
