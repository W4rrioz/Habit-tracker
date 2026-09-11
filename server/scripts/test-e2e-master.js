import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query, pool } from '../lib/db.js';
import { getTodayDateStr, getShiftedDate } from '../lib/streaks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const TEST_PORT = 3105;
const serverProc = spawn('node', ['server/index.js'], {
  cwd: path.resolve(__dirname, '../../'),
  env: { ...process.env, PORT: String(TEST_PORT) },
  stdio: 'pipe'
});

let cookieJar = '';
let adminCookieJar = '';
let passedTests = 0;
let totalTests = 0;
let testUserId = null;
let adminUserId = null;

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

async function runMasterE2E() {
  const baseUrl = `http://localhost:${TEST_PORT}/api`;
  const authUrl = `${baseUrl}/auth`;
  const habitsUrl = `${baseUrl}/habits`;
  const todosUrl = `${baseUrl}/todos`;
  const timerUrl = `${baseUrl}/timer`;
  const journalUrl = `${baseUrl}/journal`;
  const leaderboardUrl = `${baseUrl}/leaderboard`;
  const adminUrl = `${baseUrl}/admin`;

  const timestamp = Date.now();
  const testUsername = `master_e2e_${timestamp}`;
  const testPassword = 'StrongPassword123!';
  const adminUsername = `master_admin_${timestamp}`;

  console.log('\n================================================================');
  console.log('=== HABITTRACK MASTER END-TO-END QA SUITE (ALL 9 STAGES) ===');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Stage 1: Authentication & Session
  // -------------------------------------------------------------
  console.log('--- Stage 1: Authentication & Session Integrity ---');
  const signupRes = await fetch(`${authUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: testPassword })
  });
  assert(signupRes.status === 201, 'POST /api/auth/signup returned 201 Created');
  const signupData = await signupRes.json();
  testUserId = signupData.user?.id;
  assert(Boolean(testUserId), `Created user ID: ${testUserId}`);

  const rawCookie = signupRes.headers.get('set-cookie');
  assert(Boolean(rawCookie && rawCookie.includes('habittrack_session')), 'Session cookie habittrack_session received');
  cookieJar = rawCookie.split(';')[0];

  const meRes = await fetch(`${authUrl}/me`, { headers: { Cookie: cookieJar } });
  const meData = await meRes.json();
  assert(meRes.status === 200 && meData.user?.username === testUsername, 'GET /api/auth/me returns active session data');

  // -------------------------------------------------------------
  // Initial Empty States
  // -------------------------------------------------------------
  console.log('\n--- Initial Empty States Across Core Modules ---');
  const emptyHabitsRes = await fetch(habitsUrl, { headers: { Cookie: cookieJar } });
  const emptyHabits = await emptyHabitsRes.json();
  assert(Array.isArray(emptyHabits) && emptyHabits.length === 0, 'New user has empty habits array');

  const emptyTodosRes = await fetch(todosUrl, { headers: { Cookie: cookieJar } });
  const emptyTodos = await emptyTodosRes.json();
  assert(emptyTodos.today.length === 0 && emptyTodos.leftovers.length === 0, 'New user has empty todos and zero leftovers');

  const emptyTimerRes = await fetch(`${timerUrl}/today`, { headers: { Cookie: cookieJar } });
  const emptyTimer = await emptyTimerRes.json();
  assert(emptyTimer.total_sessions === 0 && emptyTimer.total_minutes === 0, 'New user has 0 timer sessions and 0 minutes today');

  // -------------------------------------------------------------
  // Stage 2: Habits CRUD & Streaks
  // -------------------------------------------------------------
  console.log('\n--- Stage 2: Habits CRUD, 7-Day History & Streak Calculation ---');
  const habitRes = await fetch(habitsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ name: 'Morning Meditation', target_frequency: 'daily' })
  });
  assert(habitRes.status === 201, 'POST /api/habits created habit successfully');
  const habitData = await habitRes.json();
  const habitId = habitData.id || habitData.habit?.id;

  const todayStr = getTodayDateStr();
  const checkinRes = await fetch(`${habitsUrl}/${habitId}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ date: todayStr })
  });
  const checkinData = await checkinRes.json();
  assert(checkinData.checked === true && checkinData.current_streak === 1, 'Checkin for today incremented streak to 1');
  assert(checkinData.total_checkins === 1, 'Total check-ins count incremented to 1');

  // -------------------------------------------------------------
  // Stage 3: Todos & Leftover Tracking
  // -------------------------------------------------------------
  console.log('\n--- Stage 3: Todos (One-time, Recurring & Leftovers) ---');
  const todoRes = await fetch(todosUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({
      title: 'Review weekly roadmap',
      due_date: todayStr,
      priority: 'high',
      recurrence: 'one_time'
    })
  });
  assert(todoRes.status === 201, 'POST /api/todos created one-time high-priority task');
  const todoData = await todoRes.json();
  const todoId = todoData.todo?.id || todoData.id;
  assert(Boolean(todoId), 'POST /api/todos created one-time high-priority task with valid ID');

  const recTodoRes = await fetch(todosUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({
      title: 'Daily mindful breathing',
      due_date: todayStr,
      priority: 'medium',
      recurrence: 'daily'
    })
  });
  const recTodoData = await recTodoRes.json();
  const recTodoId = recTodoData.todo?.id || recTodoData.id;
  assert(Boolean(recTodoId), 'POST /api/todos created recurring daily task');

  // Toggle one-time task
  const toggleTodoRes = await fetch(`${todosUrl}/${todoId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({})
  });
  const toggleTodoData = await toggleTodoRes.json();
  assert(toggleTodoData.is_completed === true, 'One-time todo toggled to completed');

  // -------------------------------------------------------------
  // Stage 5: Focus Timer & Daily Journal
  // -------------------------------------------------------------
  console.log('\n--- Stage 5: Focus Timer Sessions & Daily Journal ---');
  const timerRes = await fetch(`${timerUrl}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ duration_minutes: 25 })
  });
  assert(timerRes.status === 201, 'POST /api/timer/session logged 25m session on natural completion');

  const timerTodayRes = await fetch(`${timerUrl}/today`, { headers: { Cookie: cookieJar } });
  const timerToday = await timerTodayRes.json();
  assert(timerToday.total_sessions === 1 && timerToday.total_minutes === 25, 'Timer reflects 1 session and 25 minutes logged');

  const journalText = 'Completed mindful morning routine and deep work sprint.';
  const journalSaveRes = await fetch(`${journalUrl}/${todayStr}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ content: journalText })
  });
  assert(journalSaveRes.status === 200, 'POST /api/journal/:date upserted journal entry');

  const journalGetRes = await fetch(`${journalUrl}/${todayStr}`, { headers: { Cookie: cookieJar } });
  const journalGet = await journalGetRes.json();
  assert(journalGet.entry?.content === journalText, 'GET /api/journal/:date returned saved content verbatim');

  // -------------------------------------------------------------
  // Stage 4: Daily Dashboard Cross-Parity
  // -------------------------------------------------------------
  console.log('\n--- Stage 4: Daily Dashboard Data Cross-Consistency ---');
  const dashHabitsRes = await fetch(habitsUrl, { headers: { Cookie: cookieJar } });
  const dashHabits = await dashHabitsRes.json();
  const dashTodosRes = await fetch(todosUrl, { headers: { Cookie: cookieJar } });
  const dashTodos = await dashTodosRes.json();

  assert(dashHabits.length === 1 && dashHabits[0].is_completed_today === true, 'Dashboard reflects today habit checked');
  assert(dashTodos.completed.some(t => t.id === todoId), 'Dashboard reflects one-time todo completed');
  assert(dashTodos.today.some(t => t.id === recTodoId), 'Dashboard reflects recurring todo available for today');

  // -------------------------------------------------------------
  // Stage 6: Charts & Statistics
  // -------------------------------------------------------------
  console.log('\n--- Stage 6: Habit Consistency Charts & Visualizations ---');
  const statsRes = await fetch(`${habitsUrl}/${habitId}/stats`, { headers: { Cookie: cookieJar } });
  assert(statsRes.status === 200, 'GET /api/habits/:id/stats returned 200');
  const statsData = await statsRes.json();
  assert(typeof statsData.completion_rate_30d === 'number', 'completion_rate_30d is computed');
  assert(Boolean(statsData.completion_ring), 'completion_ring breakdown present');
  assert(Boolean(statsData.day_of_week_distribution), 'day_of_week_distribution present');
  assert(Array.isArray(statsData.daily_trend_14d) && statsData.daily_trend_14d.length === 14, 'daily_trend_14d is 14 days');
  assert(statsData.total_checkins === 1, 'Total check-ins matches 1');
  assert(statsData.has_enough_data === false, 'has_enough_data is false for 1 checkin (< 3 threshold for empty state)');

  // -------------------------------------------------------------
  // Stage 7: Leaderboard Strict Privacy & Rankings
  // -------------------------------------------------------------
  console.log('\n--- Stage 7: Leaderboard Strict Privacy & Ranking Calculation ---');
  const lbRes = await fetch(`${leaderboardUrl}?metric=current`, { headers: { Cookie: cookieJar } });
  assert(lbRes.status === 200, 'GET /api/leaderboard?metric=current returned 200');
  const lbData = await lbRes.json();
  const lbList = Array.isArray(lbData) ? lbData : (lbData.leaderboard || []);
  assert(Array.isArray(lbList), 'Leaderboard returns array');

  const myEntry = lbList.find(u => u.username === testUsername);
  assert(Boolean(myEntry), 'Current user is present in leaderboard rankings');
  assert(myEntry.is_current_user === true, 'is_current_user is true for logged-in user');
  assert(myEntry.streak === 1, 'User streak correctly calculated as 1 on leaderboard');

  // STRICT PRIVACY INVARIANT
  for (const entry of lbList) {
    assert(entry.habit_name === undefined, 'PRIVACY: habit_name is NOT leaked');
    assert(entry.habits === undefined, 'PRIVACY: habits array is NOT leaked');
    assert(entry.password_hash === undefined, 'PRIVACY: password_hash is NOT leaked');
    assert(entry.photo_url === undefined, 'PRIVACY: photo_url is NOT leaked');
  }

  // -------------------------------------------------------------
  // Stage 8: Admin Panel Server-Side Access Control
  // -------------------------------------------------------------
  console.log('\n--- Stage 8: Admin Panel Access Control & User Directory ---');
  const nonAdminAccessRes = await fetch(`${adminUrl}/users`, { headers: { Cookie: cookieJar } });
  assert(nonAdminAccessRes.status === 403, 'Non-admin user rejected with 403 Forbidden on /api/admin/users');

  // Setup Admin user
  const adminSignupRes = await fetch(`${authUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: testPassword })
  });
  const adminSignupData = await adminSignupRes.json();
  adminUserId = adminSignupData.user?.id;
  const rawAdminCookie = adminSignupRes.headers.get('set-cookie');
  adminCookieJar = rawAdminCookie.split(';')[0];

  // Elevate to admin
  await query('UPDATE users SET is_admin = true WHERE id = $1', [adminUserId]);

  const adminUsersRes = await fetch(`${adminUrl}/users`, { headers: { Cookie: adminCookieJar } });
  assert(adminUsersRes.status === 200, 'Elevated admin user successfully accessed /api/admin/users');
  const adminUsersData = await adminUsersRes.json();
  const usersList = Array.isArray(adminUsersData) ? adminUsersData : (adminUsersData.users || []);
  assert(Array.isArray(usersList), 'Admin users response contains users array');

  const inspectedUser = usersList.find(u => u.id === testUserId);
  assert(Boolean(inspectedUser), 'Test user found in admin directory');
  assert(inspectedUser.password_hash === undefined, 'Admin response omits password_hash');
  assert(inspectedUser.total_habits >= 1, `Accurate total_habits count: ${inspectedUser.total_habits}`);
  assert(inspectedUser.total_todos >= 2, `Accurate total_todos count: ${inspectedUser.total_todos}`);

  // -------------------------------------------------------------
  // Stage 9: Logout & Session Invalidation
  // -------------------------------------------------------------
  console.log('\n--- Session Cleanup & Invalidation ---');
  const logoutRes = await fetch(`${authUrl}/logout`, {
    method: 'POST',
    headers: { Cookie: cookieJar }
  });
  assert(logoutRes.status === 200, 'POST /api/auth/logout returned 200');

  const logoutCookieHeader = logoutRes.headers.get('set-cookie');
  const clearedCookie = logoutCookieHeader ? logoutCookieHeader.split(';')[0] : '';

  const postLogoutMeRes = await fetch(`${authUrl}/me`, { headers: { Cookie: clearedCookie } });
  assert(postLogoutMeRes.status === 401, 'Subsequent GET /api/auth/me with cleared cookie returned 401 Unauthenticated');

  const noCookieMeRes = await fetch(`${authUrl}/me`);
  assert(noCookieMeRes.status === 401, 'Subsequent GET /api/auth/me without cookies returned 401 Unauthenticated');

  console.log('\n================================================================');
  console.log(`🎉 ALL MASTER E2E QA TESTS PASSED! (${passedTests}/${totalTests} assertions)`);
  console.log('================================================================\n');
}

// Lifecycle
let started = false;
let testTimeout = null;

serverProc.stdout.on('data', async (d) => {
  const str = d.toString();
  if (!started && str.includes('HabitTrack server running')) {
    started = true;
    testTimeout = setTimeout(() => {
      console.error('Test timeout after 60s');
      cleanupAndExit(1);
    }, 60000);

    try {
      await runMasterE2E();
      cleanupAndExit(0);
    } catch (e) {
      console.error('\nMASTER E2E ERROR:', e);
      cleanupAndExit(1);
    }
  }
});

serverProc.stderr.on('data', (d) => {
  const str = d.toString().trim();
  if (str && !str.includes('ExperimentalWarning')) {
    console.error('[SERVER STDERR]:', str);
  }
});

async function cleanupAndExit(code) {
  if (testTimeout) clearTimeout(testTimeout);
  console.log('[Cleanup] Tearing down test data from database...');
  try {
    if (testUserId) await query('DELETE FROM users WHERE id = $1', [testUserId]);
    if (adminUserId) await query('DELETE FROM users WHERE id = $1', [adminUserId]);
    await pool.end();
  } catch (e) {}
  try {
    serverProc.kill();
  } catch (e) {}
  process.exit(code);
}
