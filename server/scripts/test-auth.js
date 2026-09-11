import { spawn } from 'child_process';

const serverProc = spawn('node', ['server/index.js'], { stdio: 'pipe' });

let cookieJar = '';

async function runTests() {
  const baseUrl = 'http://localhost:3001/api/auth';
  const testUsername = 'tester_' + Date.now();
  const testPassword = 'Password123!';

  console.log('=== RUNNING AUTH VERIFICATION SUITE ===');

  // Test 1: Validation failure (spaces in username)
  const res1 = await fetch(`${baseUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'bad user', password: testPassword })
  });
  console.log('Test 1 (Username with spaces rejected):', res1.status === 400 ? 'PASS' : 'FAIL', res1.status);

  // Test 2: Validation failure (short password)
  const res2 = await fetch(`${baseUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: '123' })
  });
  console.log('Test 2 (Short password rejected):', res2.status === 400 ? 'PASS' : 'FAIL', res2.status);

  // Test 3: Successful Signup
  const res3 = await fetch(`${baseUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: testPassword })
  });
  const data3 = await res3.json();
  const rawCookie = res3.headers.get('set-cookie');
  if (rawCookie) cookieJar = rawCookie.split(';')[0];
  console.log('Test 3 (Valid signup creates user & session):', res3.status === 201 && data3.user?.username === testUsername ? 'PASS' : 'FAIL', data3.user);

  // Test 4: Duplicate Username Rejected (case insensitive)
  const res4 = await fetch(`${baseUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername.toUpperCase(), password: testPassword })
  });
  console.log('Test 4 (Duplicate case-insensitive username rejected):', res4.status === 409 ? 'PASS' : 'FAIL', res4.status);

  // Test 5: Login with Wrong Password Rejected
  const res5 = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: 'wrongPassword!' })
  });
  console.log('Test 5 (Wrong password rejected):', res5.status === 401 ? 'PASS' : 'FAIL', res5.status);

  // Test 6: Login with Correct Password
  const res6 = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: testPassword })
  });
  const data6 = await res6.json();
  const loginCookie = res6.headers.get('set-cookie');
  if (loginCookie) cookieJar = loginCookie.split(';')[0];
  console.log('Test 6 (Valid login returns user & cookie):', res6.status === 200 && data6.user?.username === testUsername ? 'PASS' : 'FAIL', data6.user);

  // Test 7: GET /me with Cookie
  const res7 = await fetch(`${baseUrl}/me`, {
    headers: { Cookie: cookieJar }
  });
  const data7 = await res7.json();
  console.log('Test 7 (GET /me verifies active session):', res7.status === 200 && data7.user?.username === testUsername ? 'PASS' : 'FAIL', data7.user);

  // Test 8: Logout
  const res8 = await fetch(`${baseUrl}/logout`, { method: 'POST', headers: { Cookie: cookieJar } });
  const clearedCookie = res8.headers.get('set-cookie');
  console.log('Test 8 (Logout clears session):', res8.status === 200 ? 'PASS' : 'FAIL');

  // Test 9: GET /me without valid session
  const res9 = await fetch(`${baseUrl}/me`);
  console.log('Test 9 (Unauthenticated request rejected with 401):', res9.status === 401 ? 'PASS' : 'FAIL', res9.status);

  console.log('=== ALL AUTH TESTS COMPLETE ===');
}

serverProc.stdout.on('data', async (d) => {
  const str = d.toString();
  if (str.includes('HabitTrack server running')) {
    try {
      await runTests();
    } catch (e) {
      console.error('TEST ERROR:', e);
    } finally {
      serverProc.kill();
      process.exit(0);
    }
  }
});

serverProc.stderr.on('data', (d) => {
  console.error('[SERVER STDERR]:', d.toString().trim());
});

setTimeout(() => {
  console.error('Timeout waiting for auth test');
  serverProc.kill();
  process.exit(1);
}, 15000);
