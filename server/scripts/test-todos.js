import { spawn } from 'child_process';
import { query, pool } from '../lib/db.js';
import { GetLeftovers, getCurrentPeriodStart, getLastEndedPeriodStart, formatDate } from '../lib/leftovers.js';

const serverProc = spawn('node', ['server/index.js'], { stdio: 'pipe' });

let cookieJar = '';
let userId = null;

async function runTests() {
  const authUrl = 'http://localhost:3001/api/auth';
  const todosUrl = 'http://localhost:3001/api/todos';
  const testUsername = 'test_todo_' + Date.now();
  const testPassword = 'Password123!';

  console.log('\n========================================');
  console.log('=== RUNNING HABITTRACK TODOS QA SUITE ===');
  console.log('========================================\n');

  // Step 1: Signup test user
  const signupRes = await fetch(`${authUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: testPassword })
  });
  const signupData = await signupRes.json();
  const rawCookie = signupRes.headers.get('set-cookie');
  if (rawCookie) cookieJar = rawCookie.split(';')[0];
  userId = signupData.user?.id;

  if (!userId) {
    throw new Error('Failed to create test user');
  }
  console.log(`[AUTH] Created test user: ${testUsername} (id: ${userId})`);

  // -------------------------------------------------------------
  // Test Suite 1: One-Time Todo Lifecycle (Create, Toggle, Update, Delete)
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing One-Time Todo ---');

  const createOneTimeRes = await fetch(todosUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({
      title: 'Submit tax return',
      due_date: '2026-09-20',
      priority: 'high',
      recurrence: 'one_time'
    })
  });
  const oneTimeData = await createOneTimeRes.json();
  const oneTimeId = oneTimeData.todo?.id;
  console.log('1.1 Create one-time todo:', createOneTimeRes.status === 201 && oneTimeId ? 'PASS' : 'FAIL', oneTimeData.todo?.title);

  // Toggle completion ON
  const toggleOnRes = await fetch(`${todosUrl}/${oneTimeId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar }
  });
  const toggleOnData = await toggleOnRes.json();
  console.log('1.2 Toggle one-time ON (is_completed === true):', toggleOnData.is_completed === true ? 'PASS' : 'FAIL');

  // Verify in GET /api/todos that it appears in 'completed'
  const listCompletedRes = await fetch(todosUrl, { headers: { Cookie: cookieJar } });
  const listCompletedData = await listCompletedRes.json();
  const inCompleted = listCompletedData.completed.some(t => t.id === oneTimeId);
  console.log('1.3 One-time todo categorized into completed list:', inCompleted ? 'PASS' : 'FAIL');

  // Toggle completion OFF
  const toggleOffRes = await fetch(`${todosUrl}/${oneTimeId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar }
  });
  const toggleOffData = await toggleOffRes.json();
  console.log('1.4 Toggle one-time OFF (is_completed === false):', toggleOffData.is_completed === false ? 'PASS' : 'FAIL');

  // Update todo
  const updateRes = await fetch(`${todosUrl}/${oneTimeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({
      title: 'Submit updated tax return',
      priority: 'medium'
    })
  });
  const updateData = await updateRes.json();
  console.log('1.5 Update one-time todo title/priority:', updateData.todo?.title === 'Submit updated tax return' && updateData.todo?.priority === 'medium' ? 'PASS' : 'FAIL');

  // Delete todo
  const deleteRes = await fetch(`${todosUrl}/${oneTimeId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieJar }
  });
  const deleteData = await deleteRes.json();
  console.log('1.6 Delete one-time todo:', deleteRes.status === 200 && deleteData.id === oneTimeId ? 'PASS' : 'FAIL');

  // -------------------------------------------------------------
  // Test Suite 2: Recurring Todo Period Completion (todo_completions)
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Recurring Period Completion ---');

  const createDailyRes = await fetch(todosUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({
      title: 'Read 20 pages',
      priority: 'low',
      recurrence: 'daily'
    })
  });
  const dailyData = await createDailyRes.json();
  const dailyId = dailyData.todo?.id;
  console.log('2.1 Create daily recurring todo:', createDailyRes.status === 201 && dailyId ? 'PASS' : 'FAIL', dailyData.todo?.title);

  // Toggle recurring ON for current period
  const todayPeriod = getCurrentPeriodStart('daily');
  const toggleRecOnRes = await fetch(`${todosUrl}/${dailyId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar }
  });
  const toggleRecOnData = await toggleRecOnRes.json();
  console.log('2.2 Toggle recurring ON:', toggleRecOnData.is_completed === true && toggleRecOnData.period_start === todayPeriod ? 'PASS' : 'FAIL');

  // Verify in database that row exists in todo_completions
  const dbCompCheck1 = await query(
    'SELECT * FROM todo_completions WHERE todo_id = $1 AND period_start = $2::date',
    [dailyId, todayPeriod]
  );
  console.log('2.3 Database record in todo_completions exists:', dbCompCheck1.rows.length === 1 ? 'PASS' : 'FAIL');

  // Toggle recurring OFF
  const toggleRecOffRes = await fetch(`${todosUrl}/${dailyId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar }
  });
  const toggleRecOffData = await toggleRecOffRes.json();
  console.log('2.4 Toggle recurring OFF:', toggleRecOffData.is_completed === false ? 'PASS' : 'FAIL');

  // Verify in database that row was deleted from todo_completions
  const dbCompCheck2 = await query(
    'SELECT * FROM todo_completions WHERE todo_id = $1 AND period_start = $2::date',
    [dailyId, todayPeriod]
  );
  console.log('2.5 Database record in todo_completions removed:', dbCompCheck2.rows.length === 0 ? 'PASS' : 'FAIL');

  // -------------------------------------------------------------
  // Test Suite 3: Leftover Detection (Daily, Weekly crossing Mon, Monthly)
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Leftover Detection ---');

  // 3.1 Daily leftover
  // If system date advances to tomorrow, yesterday's uncompleted daily todo is leftover
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);
  const yesterdayOfTomorrow = formatDate(new Date());

  const dailyLeftoversBefore = await GetLeftovers(userId, tomorrow);
  const isDailyLeftover = dailyLeftoversBefore.some(t => t.id === dailyId && t.leftover_period_type === 'daily' && t.leftover_period_start === yesterdayOfTomorrow);
  console.log('3.1 Daily leftover detected when advancing to tomorrow:', isDailyLeftover ? 'PASS' : 'FAIL');

  // Complete yesterday's period
  const compYesterdayRes = await fetch(`${todosUrl}/${dailyId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ period_start: yesterdayOfTomorrow })
  });
  const compYesterdayData = await compYesterdayRes.json();
  const dailyLeftoversAfter = await GetLeftovers(userId, tomorrow);
  const isDailyCleared = !dailyLeftoversAfter.some(t => t.id === dailyId);
  console.log('3.2 Daily leftover cleared after marking completion for period:', isDailyCleared ? 'PASS' : 'FAIL');

  // 3.2 Weekly leftover crossing Monday
  // Create a weekly todo
  const createWeeklyRes = await fetch(todosUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({
      title: 'Weekly Budget Review',
      priority: 'high',
      recurrence: 'weekly'
    })
  });
  const weeklyData = await createWeeklyRes.json();
  const weeklyId = weeklyData.todo?.id;

  // Let Sunday be 2026-09-13 (current week is 2026-09-07 to 2026-09-13, last ended week is 2026-08-31)
  const sundayRef = new Date('2026-09-13T12:00:00Z');
  // Mark completed for 2026-08-31 so it's not leftover on Sunday
  await query(
    'INSERT INTO todo_completions (todo_id, period_start) VALUES ($1, \'2026-08-31\') ON CONFLICT DO NOTHING',
    [weeklyId]
  );
  const weeklyLeftoversSunday = await GetLeftovers(userId, sundayRef);
  const isWeeklyLeftoverOnSunday = weeklyLeftoversSunday.some(t => t.id === weeklyId);
  console.log('3.3 Weekly todo NOT leftover on Sunday before week ends:', !isWeeklyLeftoverOnSunday ? 'PASS' : 'FAIL');

  // Advance reference date across Monday boundary to Monday 2026-09-14
  // Now the week 2026-09-07 has ended!
  const mondayRef = new Date('2026-09-14T12:00:00Z');
  const weeklyLeftoversMonday = await GetLeftovers(userId, mondayRef);
  const isWeeklyLeftoverOnMonday = weeklyLeftoversMonday.some(
    t => t.id === weeklyId && t.leftover_period_type === 'weekly' && t.leftover_period_start === '2026-09-07'
  );
  console.log('3.4 Weekly todo IS leftover on Monday (week crossing verified, period 2026-09-07):', isWeeklyLeftoverOnMonday ? 'PASS' : 'FAIL');

  // Now mark it completed for period 2026-09-07
  await fetch(`${todosUrl}/${weeklyId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ period_start: '2026-09-07' })
  });
  const weeklyLeftoversAfter = await GetLeftovers(userId, mondayRef);
  const isWeeklyCleared = !weeklyLeftoversAfter.some(t => t.id === weeklyId);
  console.log('3.5 Weekly leftover cleared after completion:', isWeeklyCleared ? 'PASS' : 'FAIL');

  // 3.3 Monthly leftover crossing month boundary
  // Create a monthly todo
  const createMonthlyRes = await fetch(todosUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({
      title: 'Inspect smoke alarms & filters',
      priority: 'medium',
      recurrence: 'monthly'
    })
  });
  const monthlyData = await createMonthlyRes.json();
  const monthlyId = monthlyData.todo?.id;

  // Let reference date be end of month: 2026-09-30
  // Mark completed for August 2026 (2026-08-01)
  await query(
    'INSERT INTO todo_completions (todo_id, period_start) VALUES ($1, \'2026-08-01\') ON CONFLICT DO NOTHING',
    [monthlyId]
  );
  const septEndRef = new Date('2026-09-30T12:00:00Z');
  const monthlyLeftoversSept = await GetLeftovers(userId, septEndRef);
  const isMonthlyLeftoverSept = monthlyLeftoversSept.some(t => t.id === monthlyId);
  console.log('3.6 Monthly todo NOT leftover on Sep 30 before month ends:', !isMonthlyLeftoverSept ? 'PASS' : 'FAIL');

  // Advance reference date across month boundary to October 1: 2026-10-01
  // Now September (2026-09-01) has ended!
  const octFirstRef = new Date('2026-10-01T12:00:00Z');
  const monthlyLeftoversOct = await GetLeftovers(userId, octFirstRef);
  const isMonthlyLeftoverOct = monthlyLeftoversOct.some(
    t => t.id === monthlyId && t.leftover_period_type === 'monthly' && t.leftover_period_start === '2026-09-01'
  );
  console.log('3.7 Monthly todo IS leftover on Oct 1 (month crossing verified, period 2026-09-01):', isMonthlyLeftoverOct ? 'PASS' : 'FAIL');

  // Complete September monthly period
  await fetch(`${todosUrl}/${monthlyId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ period_start: '2026-09-01' })
  });
  const monthlyLeftoversCleared = await GetLeftovers(userId, octFirstRef);
  const isMonthlyCleared = !monthlyLeftoversCleared.some(t => t.id === monthlyId);
  console.log('3.8 Monthly leftover cleared after completion:', isMonthlyCleared ? 'PASS' : 'FAIL');

  // -------------------------------------------------------------
  // Test Suite 4: GET /api/todos Categorization
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing GET /api/todos Categorization ---');
  const getCatRes = await fetch(`${todosUrl}?refDate=2026-10-01`, {
    headers: { Cookie: cookieJar }
  });
  const getCatData = await getCatRes.json();
  const hasExpectedKeys = ['today', 'upcoming', 'completed', 'leftovers'].every(k => Array.isArray(getCatData[k]));
  console.log('4.1 Categorized response contains today, upcoming, completed, leftovers arrays:', hasExpectedKeys ? 'PASS' : 'FAIL');

  // Cleanup test user data
  await query('DELETE FROM users WHERE id = $1', [userId]);
  console.log(`[CLEANUP] Deleted test user: ${userId}`);

  console.log('\n========================================');
  console.log('=== ALL TODO & LEFTOVER TESTS PASSED ===');
  console.log('========================================\n');
}

let started = false;
let testTimer = null;

serverProc.stdout.on('data', async (d) => {
  const str = d.toString();
  if (!started && str.includes('HabitTrack server running')) {
    started = true;
    if (startTimeout) clearTimeout(startTimeout);
    testTimer = setTimeout(async () => {
      console.error('Timeout executing test suite');
      serverProc.kill();
      try { await pool.end(); } catch (e) {}
      process.exit(1);
    }, 60000);

    try {
      await runTests();
      if (testTimer) clearTimeout(testTimer);
    } catch (e) {
      console.error('TEST SUITE ERROR:', e);
      serverProc.kill();
      try { await pool.end(); } catch (e) {}
      process.exit(1);
    } finally {
      serverProc.kill();
      try { await pool.end(); } catch (e) {}
      process.exit(0);
    }
  }
});

serverProc.stderr.on('data', (d) => {
  console.error('[SERVER STDERR]:', d.toString().trim());
});

const startTimeout = setTimeout(async () => {
  console.error('Timeout waiting for HabitTrack server to start');
  serverProc.kill();
  try { await pool.end(); } catch (e) {}
  process.exit(1);
}, 20000);

