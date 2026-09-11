import { spawn } from 'child_process';
import { query, pool } from '../lib/db.js';
import { getShiftedDate, getTodayDateStr } from '../lib/streaks.js';
import { formatDate, getCurrentPeriodStart, getLastEndedPeriodStart } from '../lib/leftovers.js';

const serverProc = spawn('node', ['server/index.js'], { stdio: 'pipe' });

let cookieJar = '';
let userId = null;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  const authUrl = 'http://localhost:3001/api/auth';
  const habitsUrl = 'http://localhost:3001/api/habits';
  const todosUrl = 'http://localhost:3001/api/todos';
  const testUsername = 'test_dash_' + Date.now();
  const testPassword = 'Password123!';

  console.log('\n========================================================');
  console.log('=== RUNNING HABITTRACK DAILY DASHBOARD (STAGE 4) QA ===');
  console.log('========================================================\n');

  // Step 1: Signup test user
  console.log('[Setup] Registering test user for Dashboard suite...');
  const signupRes = await fetch(`${authUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: testPassword })
  });
  const signupData = await signupRes.json();
  const rawCookie = signupRes.headers.get('set-cookie');
  if (rawCookie) cookieJar = rawCookie.split(';')[0];
  userId = signupData.user?.id;

  assert(Boolean(userId), `User created with ID: ${userId}`);

  // -------------------------------------------------------------
  // Test Suite 1: Habit Check-in Dashboard / Dedicated Endpoint Parity
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing Habit Check-in Parity (Dashboard Toggle vs Dedicated Endpoint) ---');

  // 1.1 Create habit
  const createHabitRes = await fetch(habitsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({
      name: 'Hydration 2L',
      target_frequency: 'daily'
    })
  });
  const habitData = await createHabitRes.json();
  const habitId = habitData.id || habitData.habit?.id;
  const habitName = habitData.name || habitData.habit?.name;
  assert(createHabitRes.status === 201 && Boolean(habitId), `Created habit "${habitName}" (id: ${habitId})`);

  // 1.2 Fetch initial habits list
  const initialHabitsRes = await fetch(habitsUrl, {
    headers: { Cookie: cookieJar }
  });
  const initialHabits = await initialHabitsRes.json();
  const hInitial = initialHabits.find(h => h.id === habitId);
  assert(hInitial !== undefined, 'Habit is present in GET /api/habits');
  assert(hInitial.is_completed_today === false, 'Initial state: is_completed_today is false');
  assert(hInitial.current_streak === 0, 'Initial state: current_streak is 0');

  // 1.3 Check off habit via Dashboard action: POST /api/habits/:id/checkin
  const checkinRes = await fetch(`${habitsUrl}/${habitId}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ date: getTodayDateStr() })
  });
  const checkinData = await checkinRes.json();
  assert(checkinRes.status === 200 && checkinData.success === true, 'POST /api/habits/:id/checkin succeeded');
  assert(checkinData.checked === true, 'Checkin toggle returned checked: true');
  assert(checkinData.current_streak === 1, 'Checkin toggle returned current_streak: 1');
  assert(checkinData.is_completed_today === true, 'Checkin toggle returned is_completed_today: true');

  // 1.4 Verify dedicated GET /api/habits reflects identical state
  const postCheckinHabitsRes = await fetch(habitsUrl, {
    headers: { Cookie: cookieJar }
  });
  const postCheckinHabits = await postCheckinHabitsRes.json();
  const hChecked = postCheckinHabits.find(h => h.id === habitId);
  assert(hChecked.is_completed_today === true, 'GET /api/habits reflects is_completed_today: true identically');
  assert(hChecked.current_streak === 1, 'GET /api/habits reflects current_streak: 1 identically');
  assert(hChecked.total_checkins === 1, 'GET /api/habits reflects total_checkins: 1 identically');

  // 1.5 Uncheck habit via Dashboard action: POST /api/habits/:id/checkin
  const uncheckRes = await fetch(`${habitsUrl}/${habitId}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ date: getTodayDateStr() })
  });
  const uncheckData = await uncheckRes.json();
  assert(uncheckData.checked === false, 'Uncheck toggle returned checked: false');
  assert(uncheckData.current_streak === 0, 'Uncheck toggle returned current_streak: 0');
  assert(uncheckData.is_completed_today === false, 'Uncheck toggle returned is_completed_today: false');

  // 1.6 Verify dedicated endpoint after unchecking
  const postUncheckHabitsRes = await fetch(habitsUrl, {
    headers: { Cookie: cookieJar }
  });
  const postUncheckHabits = await postUncheckHabitsRes.json();
  const hUnchecked = postUncheckHabits.find(h => h.id === habitId);
  assert(hUnchecked.is_completed_today === false, 'GET /api/habits reflects is_completed_today: false after uncheck');
  assert(hUnchecked.current_streak === 0, 'GET /api/habits reflects current_streak: 0 after uncheck');

  // -------------------------------------------------------------
  // Test Suite 2: Todo Toggle Dashboard / Dedicated Endpoint Parity
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Todo Completion Parity (Dashboard Toggle vs Dedicated Endpoint) ---');

  const todayStr = getTodayDateStr();

  // 2.1 Create one-time todo due today
  const createTodoRes = await fetch(todosUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({
      title: 'Review quarterly goals',
      due_date: todayStr,
      priority: 'high',
      recurrence: 'one_time'
    })
  });
  const todoData = await createTodoRes.json();
  const todoId = todoData.todo?.id;
  assert(createTodoRes.status === 201 && Boolean(todoId), `Created todo "${todoData.todo?.title}" (id: ${todoId})`);

  // 2.2 Verify initial state in GET /api/todos
  const initialTodosRes = await fetch(todosUrl, {
    headers: { Cookie: cookieJar }
  });
  const initialTodos = await initialTodosRes.json();
  const tInToday = (initialTodos.today || []).find(t => t.id === todoId);
  assert(tInToday !== undefined, 'Todo is in "today" list in GET /api/todos');
  assert(tInToday.is_completed === false, 'Initial state: is_completed is false');

  // 2.3 Toggle completion ON via Dashboard action: POST /api/todos/:id/toggle
  const toggleOnRes = await fetch(`${todosUrl}/${todoId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({})
  });
  const toggleOnData = await toggleOnRes.json();
  assert(toggleOnRes.status === 200, 'POST /api/todos/:id/toggle succeeded');
  assert(toggleOnData.is_completed === true, 'Toggle response returned is_completed: true');

  // 2.4 Verify dedicated endpoint: Todo moves to "completed" array with is_completed: true
  const postToggleTodosRes = await fetch(todosUrl, {
    headers: { Cookie: cookieJar }
  });
  const postToggleTodos = await postToggleTodosRes.json();
  const tCompleted = (postToggleTodos.completed || []).find(t => t.id === todoId);
  assert(tCompleted !== undefined, 'GET /api/todos reflects todo in "completed" list');
  assert(tCompleted.is_completed === true, 'GET /api/todos reflects is_completed: true identically');

  // 2.5 Toggle completion OFF via Dashboard action: POST /api/todos/:id/toggle
  const toggleOffRes = await fetch(`${todosUrl}/${todoId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({})
  });
  const toggleOffData = await toggleOffRes.json();
  assert(toggleOffData.is_completed === false, 'Toggle response returned is_completed: false');

  // 2.6 Verify dedicated endpoint: Todo moves back to "today" array with is_completed: false
  const revertedTodosRes = await fetch(todosUrl, {
    headers: { Cookie: cookieJar }
  });
  const revertedTodos = await revertedTodosRes.json();
  const tReverted = (revertedTodos.today || []).find(t => t.id === todoId);
  assert(tReverted !== undefined, 'GET /api/todos reflects todo back in "today" list');
  assert(tReverted.is_completed === false, 'GET /api/todos reflects is_completed: false identically');

  // -------------------------------------------------------------
  // Test Suite 3: Leftovers Completion Parity
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing Leftover Recurring Task Completion via Dashboard ---');

  // 3.1 Create daily recurring todo
  const createRecTodoRes = await fetch(todosUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({
      title: 'Daily mindfulness session',
      priority: 'low',
      recurrence: 'daily'
    })
  });
  const recTodoData = await createRecTodoRes.json();
  const recTodoId = recTodoData.todo?.id;
  assert(Boolean(recTodoId), `Created recurring todo (id: ${recTodoId})`);

  // 3.2 Simulate an ended period leftover (yesterday) by backdating creation date
  const yesterdayStr = getShiftedDate(todayStr, -1);
  await query(
    `UPDATE todos SET created_at = ($1::date - INTERVAL '2 days') WHERE id = $2`,
    [todayStr, recTodoId]
  );

  // Fetch todos to verify leftover is detected
  const leftoverCheckRes = await fetch(todosUrl, {
    headers: { Cookie: cookieJar }
  });
  const leftoverCheckData = await leftoverCheckRes.json();
  const foundLeftover = (leftoverCheckData.leftovers || []).find(l => l.id === recTodoId);
  assert(foundLeftover !== undefined, 'Yesterday unfinished recurring task is flagged as leftover');
  assert(foundLeftover.leftover_period_start === yesterdayStr, `Leftover period start is yesterday (${yesterdayStr})`);

  // 3.3 Complete leftover via Dashboard one-tap action: POST /api/todos/:id/toggle with period_start
  const completeLeftoverRes = await fetch(`${todosUrl}/${recTodoId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ period_start: foundLeftover.leftover_period_start })
  });
  const completeLeftoverData = await completeLeftoverRes.json();
  assert(completeLeftoverData.is_completed === true, 'Leftover marked complete via period_start toggle');

  // 3.4 Verify leftover is now resolved and no longer appears in leftovers
  const postLeftoverRes = await fetch(todosUrl, {
    headers: { Cookie: cookieJar }
  });
  const postLeftoverData = await postLeftoverRes.json();
  const resolvedLeftover = (postLeftoverData.leftovers || []).find(l => l.id === recTodoId);
  assert(resolvedLeftover === undefined, 'Completed leftover is removed from leftovers list');

  // -------------------------------------------------------------
  // Test Suite 4: Overall Daily Progress Calculation
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Overall Daily Progress Bar Calculation ---');

  // State right now:
  // Habits: 1 habit ("Hydration 2L"), currently unchecked (0/1)
  // Todos for today: 2 todos ("Review quarterly goals" unchecked, "Daily mindfulness session" unchecked) (0/2)
  // Total items = 3, completed = 0 -> 0%
  function getDashboardTodos(todosJson) {
    const todayTodoIds = new Set((todosJson.today || []).map(t => t.id));
    const completedOneTimeToday = (todosJson.completed || []).filter(t => {
      if (t.recurrence !== 'one_time') return false;
      if (todayTodoIds.has(t.id)) return false;
      if (t.due_date) return t.due_date === todayStr;
      return t.created_at && t.created_at.startsWith(todayStr);
    });
    return [...(todosJson.today || []), ...completedOneTimeToday];
  }

  let hListRes = await fetch(habitsUrl, { headers: { Cookie: cookieJar } });
  let tListRes = await fetch(todosUrl, { headers: { Cookie: cookieJar } });
  let currentHabits = await hListRes.json();
  let currentTodos = await tListRes.json();
  let dashboardTodos = getDashboardTodos(currentTodos);

  let hDone = currentHabits.filter(h => h.is_completed_today).length;
  let tDone = dashboardTodos.filter(t => t.is_completed).length;
  let totalCount = currentHabits.length + dashboardTodos.length;
  let doneCount = hDone + tDone;
  let progressPct = Math.round((doneCount / totalCount) * 100);

  assert(progressPct === 0, `Initial progress is 0% (${doneCount}/${totalCount})`);

  // Complete the habit
  await fetch(`${habitsUrl}/${habitId}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({ date: todayStr })
  });

  // Re-fetch and re-calculate
  hListRes = await fetch(habitsUrl, { headers: { Cookie: cookieJar } });
  currentHabits = await hListRes.json();
  hDone = currentHabits.filter(h => h.is_completed_today).length;
  doneCount = hDone + tDone;
  progressPct = Math.round((doneCount / totalCount) * 100);

  assert(hDone === 1, '1 habit is completed');
  assert(progressPct === 33, `Progress updated to 33% (${doneCount}/${totalCount}) after habit check-in`);

  // Complete 1 todo
  await fetch(`${todosUrl}/${todoId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({})
  });

  tListRes = await fetch(todosUrl, { headers: { Cookie: cookieJar } });
  currentTodos = await tListRes.json();
  dashboardTodos = getDashboardTodos(currentTodos);
  tDone = dashboardTodos.filter(t => t.is_completed).length;
  doneCount = hDone + tDone;
  progressPct = Math.round((doneCount / totalCount) * 100);

  assert(tDone === 1, '1 todo is completed');
  assert(progressPct === 67, `Progress updated to 67% (${doneCount}/${totalCount}) after todo check`);

  // Complete the remaining recurring todo for today
  await fetch(`${todosUrl}/${recTodoId}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
    body: JSON.stringify({})
  });

  tListRes = await fetch(todosUrl, { headers: { Cookie: cookieJar } });
  currentTodos = await tListRes.json();
  dashboardTodos = getDashboardTodos(currentTodos);
  tDone = dashboardTodos.filter(t => t.is_completed).length;
  doneCount = hDone + tDone;
  progressPct = Math.round((doneCount / totalCount) * 100);

  assert(tDone === 2, 'Both todos are completed');
  assert(progressPct === 100, `Progress reached 100% (${doneCount}/${totalCount})!`);

  console.log('\n========================================================');
  console.log('✅ ALL DAILY DASHBOARD STAGE 4 QA TESTS PASSED!');
  console.log('========================================================\n');
}

// Execution lifecycle
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

    let exitCode = 0;
    try {
      await runTests();
      if (testTimer) clearTimeout(testTimer);
    } catch (e) {
      console.error('TEST SUITE ERROR:', e);
      exitCode = 1;
    } finally {
      if (testTimer) clearTimeout(testTimer);
      // Cleanup user
      if (userId) {
        console.log(`[Cleanup] Cleaning up test data for user: ${userId}`);
        try {
          await query('DELETE FROM users WHERE id = $1', [userId]);
        } catch (e) {}
      }
      try {
        serverProc.kill();
      } catch (e) {}
      try {
        await pool.end();
      } catch (e) {}
      process.exit(exitCode);
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
