import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use an alternative port so it does not conflict if another server instance is running
const TEST_PORT = 3099;
const serverProc = spawn('node', ['server/index.js'], {
  cwd: path.resolve(__dirname, '../../'),
  env: { ...process.env, PORT: String(TEST_PORT) },
  stdio: 'pipe'
});

let cookieJar = '';
let passedTests = 0;
let totalTests = 0;

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
  const authUrl = `http://localhost:${TEST_PORT}/api/auth`;
  const timerUrl = `http://localhost:${TEST_PORT}/api/timer`;
  const journalUrl = `http://localhost:${TEST_PORT}/api/journal`;

  const testUsername = 'stage5_user_' + Date.now();
  const testPassword = 'Password123!';

  console.log('\n======================================================');
  console.log('=== STAGE 5 VERIFICATION: TIMER & JOURNAL SUITE ===');
  console.log('======================================================\n');

  // --- PRE-AUTH CHECKS ---
  console.log('--- 1. Auth Protection Checks ---');
  const unauthTimerRes = await fetch(`${timerUrl}/today`);
  assert(unauthTimerRes.status === 401, 'GET /api/timer/today rejected when unauthenticated');

  const unauthJournalRes = await fetch(`${journalUrl}/2026-09-11`);
  assert(unauthJournalRes.status === 401, 'GET /api/journal/:date rejected when unauthenticated');

  // --- SIGNUP & AUTH SETUP ---
  console.log('\n--- 2. User Authentication Setup ---');
  const signupRes = await fetch(`${authUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: testPassword })
  });
  assert(signupRes.status === 201, 'Test user registered successfully');
  const rawCookie = signupRes.headers.get('set-cookie');
  if (rawCookie) {
    cookieJar = rawCookie.split(';')[0];
  }
  assert(!!cookieJar, 'Session cookie captured');

  const headers = {
    'Content-Type': 'application/json',
    Cookie: cookieJar
  };

  // --- FOCUS TIMER TESTS ---
  console.log('\n--- 3. Focus Timer Tests ---');
  
  // 3a. Initial today stats
  const initialTimerRes = await fetch(`${timerUrl}/today`, { headers });
  assert(initialTimerRes.status === 200, 'GET /api/timer/today succeeds');
  const initialStats = await initialTimerRes.json();
  assert(initialStats.total_sessions === 0, 'Initial total_sessions is 0');
  assert(initialStats.total_minutes === 0, 'Initial total_minutes is 0');

  // 3b. Natural completion 1: 25-minute session
  const session1Res = await fetch(`${timerUrl}/session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ duration_minutes: 25 })
  });
  assert(session1Res.status === 201, 'POST /api/timer/session returns 201 Created on completion');
  const session1Data = await session1Res.json();
  assert(session1Data.session && session1Data.session.duration_minutes === 25, 'Session 1 logged with 25 minutes');

  // 3c. Stats updated after session 1
  const after1Res = await fetch(`${timerUrl}/today`, { headers });
  const after1Stats = await after1Res.json();
  assert(after1Stats.total_sessions === 1, 'Today total_sessions incremented to 1');
  assert(after1Stats.total_minutes === 25, 'Today total_minutes updated to 25');

  // 3d. Natural completion 2: 15-minute session
  const session2Res = await fetch(`${timerUrl}/session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ duration_minutes: 15 })
  });
  assert(session2Res.status === 201, 'POST /api/timer/session for 15 minutes returns 201');
  const session2Data = await session2Res.json();
  assert(session2Data.session && session2Data.session.duration_minutes === 15, 'Session 2 logged with 15 minutes');

  // 3e. Stats updated after session 2
  const after2Res = await fetch(`${timerUrl}/today`, { headers });
  const after2Stats = await after2Res.json();
  assert(after2Stats.total_sessions === 2, 'Today total_sessions incremented to 2');
  assert(after2Stats.total_minutes === 40, 'Today total_minutes updated to 40');

  // 3f. Manual reset verification:
  // When a user resets a timer manually, no POST /api/timer/session is dispatched.
  // Verify that without dispatching completion, stats remain strictly unchanged.
  const resetCheckRes = await fetch(`${timerUrl}/today`, { headers });
  const resetCheckStats = await resetCheckRes.json();
  assert(resetCheckStats.total_sessions === 2, 'Manual reset does not log: total_sessions remains 2');
  assert(resetCheckStats.total_minutes === 40, 'Manual reset does not log: total_minutes remains 40');

  // 3g. Invalid duration validation
  const invalidDurationRes = await fetch(`${timerUrl}/session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ duration_minutes: -10 })
  });
  assert(invalidDurationRes.status === 400, 'Invalid negative duration rejected with 400');

  // --- DAILY JOURNAL TESTS ---
  console.log('\n--- 4. Daily Journal Tests ---');
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // 4a. Initial GET for today (empty)
  const initialJournalRes = await fetch(`${journalUrl}/${todayStr}`, { headers });
  assert(initialJournalRes.status === 200, `GET /api/journal/${todayStr} succeeds`);
  const initialJournalData = await initialJournalRes.json();
  assert(initialJournalData.entry === null, 'Non-existent journal entry returns entry: null');

  // 4b. Create initial entry for today
  const firstContent = 'Today was a productive day. Maintained calm focus throughout the morning deep work sprint.';
  const save1Res = await fetch(`${journalUrl}/${todayStr}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: firstContent })
  });
  assert(save1Res.status === 200, `POST /api/journal/${todayStr} returns 200 OK`);
  const save1Data = await save1Res.json();
  assert(save1Data.entry && save1Data.entry.content === firstContent, 'Saved entry matches initial content');

  // 4c. Verify GET returns the saved entry
  const fetch1Res = await fetch(`${journalUrl}/${todayStr}`, { headers });
  const fetch1Data = await fetch1Res.json();
  assert(fetch1Data.entry !== null, 'Fetched journal entry is non-null');
  assert(fetch1Data.entry.content === firstContent, 'Fetched journal content matches saved content');
  assert(fetch1Data.entry.date === todayStr, `Fetched journal date matches ${todayStr}`);

  // 4d. Upsert on conflict (user_id, date) with updated reflection
  const updatedContent = 'Evening update: Successfully delivered Stage 5 focus timer & daily journal features!';
  const save2Res = await fetch(`${journalUrl}/${todayStr}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: updatedContent })
  });
  assert(save2Res.status === 200, `POST /api/journal/${todayStr} upsert returns 200 OK`);
  const save2Data = await save2Res.json();
  assert(save2Data.entry && save2Data.entry.content === updatedContent, 'Upserted entry returns updated content');

  // 4e. Confirm GET returns updated content without duplicating entries
  const fetch2Res = await fetch(`${journalUrl}/${todayStr}`, { headers });
  const fetch2Data = await fetch2Res.json();
  assert(fetch2Data.entry.content === updatedContent, 'Fetched journal entry has updated content');

  // 4f. Create entry for a different date (yesterday)
  const yesterdayContent = 'Yesterday reflection: Planned sprint architecture and reviewed calm UI design system.';
  const saveYesterdayRes = await fetch(`${journalUrl}/${yesterdayStr}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: yesterdayContent })
  });
  assert(saveYesterdayRes.status === 200, `POST /api/journal/${yesterdayStr} returns 200 OK`);

  const fetchYesterdayRes = await fetch(`${journalUrl}/${yesterdayStr}`, { headers });
  const fetchYesterdayData = await fetchYesterdayRes.json();
  assert(fetchYesterdayData.entry.content === yesterdayContent, 'Yesterday entry persisted distinctly');

  // 4g. Today and Yesterday entries remain distinct
  const refetchTodayRes = await fetch(`${journalUrl}/${todayStr}`, { headers });
  const refetchTodayData = await refetchTodayRes.json();
  assert(refetchTodayData.entry.content === updatedContent, 'Today entry unchanged by yesterday entry');

  // 4h. Invalid date format handling
  const invalidDateRes = await fetch(`${journalUrl}/not-a-valid-date`, { headers });
  assert(invalidDateRes.status === 400, 'Invalid date format rejected with 400');

  console.log('\n======================================================');
  console.log(`✓ ALL ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('======================================================\n');
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
  console.error('Test timeout after 20 seconds');
  serverProc.kill();
  process.exit(1);
}, 20000);
