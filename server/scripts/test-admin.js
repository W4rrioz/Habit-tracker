import { spawn } from 'child_process';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import { query, pool } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

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

async function startSuite() {
  const TEST_PORT = await getAvailablePort();
  console.log(`Starting HabitTrack test server on dynamic port ${TEST_PORT}...`);

  const serverProc = spawn('node', ['server/index.js'], {
    cwd: path.resolve(__dirname, '../../'),
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: 'pipe'
  });

  async function runTests() {
    const authUrl = `http://localhost:${TEST_PORT}/api/auth`;
    const adminUrl = `http://localhost:${TEST_PORT}/api/admin`;

    const timestamp = Date.now();
    const regularUsername = `test_reg_${timestamp}`;
    const adminUsername = `test_adm_${timestamp}`;
    const subjectUsername = `test_subj_${timestamp}`;
    const password = 'Password123!';

    console.log('\n======================================================');
    console.log('=== STAGE 8 VERIFICATION: ADMIN PANEL TEST SUITE ===');
    console.log('======================================================\n');

    try {
      // -------------------------------------------------------------
      // Test 1: Unauthenticated request to /api/admin/users
      // -------------------------------------------------------------
      console.log('--- 1. Unauthenticated Access Check ---');
      const unauthRes = await fetch(`${adminUrl}/users`);
      assert(unauthRes.status === 401, 'Unauthenticated GET /api/admin/users rejected with 401');

      // -------------------------------------------------------------
      // Test 2: Non-admin account rejected with 403 Forbidden
      // -------------------------------------------------------------
      console.log('\n--- 2. Non-Admin 403 Forbidden Check ---');
      const regSignupRes = await fetch(`${authUrl}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regularUsername, password })
      });
      assert(regSignupRes.status === 201, 'Regular user created successfully');
      const regCookie = regSignupRes.headers.get('set-cookie')?.split(';')[0];
      assert(Boolean(regCookie), 'Received session cookie for regular user');

      const regAdminRes = await fetch(`${adminUrl}/users`, {
        headers: { Cookie: regCookie }
      });
      assert(regAdminRes.status === 403, 'Non-admin request to GET /api/admin/users rejected with 403');
      const regAdminBody = await regAdminRes.json();
      assert(
        regAdminBody.error === 'Forbidden: Admin access required.',
        '403 response contains exact error message: "Forbidden: Admin access required."'
      );

      // -------------------------------------------------------------
      // Test 3: Admin account setup and habit/todo count verification
      // -------------------------------------------------------------
      console.log('\n--- 3. Admin User Setup & Verification ---');
      // Create admin user
      const admSignupRes = await fetch(`${authUrl}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password })
      });
      assert(admSignupRes.status === 201, 'Admin user created successfully');
      const admData = await admSignupRes.json();
      const adminUserId = admData.user.id;
      const admCookie = admSignupRes.headers.get('set-cookie')?.split(';')[0];

      // Promote admin in the database
      await query('UPDATE users SET is_admin = true WHERE id = $1', [adminUserId]);
      console.log(`  ✓ Promoted user ${adminUsername} (ID: ${adminUserId}) to admin in DB`);

      // Create a subject user with known habit and todo counts
      const subjSignupRes = await fetch(`${authUrl}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: subjectUsername, password })
      });
      assert(subjSignupRes.status === 201, 'Subject user created successfully');
      const subjData = await subjSignupRes.json();
      const subjUserId = subjData.user.id;

      // Insert 2 habits for subject user
      await query(
        `INSERT INTO habits (user_id, name, target_frequency, is_archived)
         VALUES ($1, 'Morning Jogging', 'daily', false),
                ($1, 'Evening Reading', 'daily', false)`,
        [subjUserId]
      );
      console.log(`  ✓ Created 2 habits for subject user ${subjectUsername}`);

      // Insert 3 todos for subject user
      await query(
        `INSERT INTO todos (user_id, title, priority, recurrence)
         VALUES ($1, 'Buy groceries', 'medium', 'one_time'),
                ($1, 'Submit weekly report', 'high', 'weekly'),
                ($1, 'Pay electric bill', 'high', 'one_time')`,
        [subjUserId]
      );
      console.log(`  ✓ Created 3 todos for subject user ${subjectUsername}`);

      // -------------------------------------------------------------
      // Test 4: Admin GET /api/admin/users verification
      // -------------------------------------------------------------
      console.log('\n--- 4. Admin GET /api/admin/users Execution ---');
      const adminFetchRes = await fetch(`${adminUrl}/users`, {
        headers: { Cookie: admCookie }
      });
      assert(adminFetchRes.status === 200, 'Admin request to GET /api/admin/users returns 200 OK');

      const usersList = await adminFetchRes.json();
      assert(Array.isArray(usersList), 'Response is an array of users');
      assert(usersList.length >= 3, `Received user list with ${usersList.length} users`);

      // Security check: password_hash must never be present
      const hasPasswordHash = usersList.some(u => u.password_hash !== undefined || 'password_hash' in u);
      assert(!hasPasswordHash, 'Security check: password_hash is never exposed in response');

      // Field integrity check on every user
      const allHaveRequiredFields = usersList.every(
        u => u.id && u.username && typeof u.is_admin === 'boolean' && u.created_at &&
             typeof u.total_habits === 'number' && typeof u.total_todos === 'number'
      );
      assert(allHaveRequiredFields, 'Every user record contains id, username, is_admin, created_at, total_habits, total_todos');

      // Verify accurate habit and todo counts for the subject user
      const subjectRecord = usersList.find(u => u.id === subjUserId || u.username === subjectUsername);
      assert(Boolean(subjectRecord), `Found subject user ${subjectUsername} in admin response`);
      assert(subjectRecord.is_admin === false, 'Subject user is_admin is false');
      assert(subjectRecord.total_habits === 2, `Subject user total_habits is accurately 2 (got ${subjectRecord.total_habits})`);
      assert(subjectRecord.total_todos === 3, `Subject user total_todos is accurately 3 (got ${subjectRecord.total_todos})`);

      // Verify admin record
      const adminRecord = usersList.find(u => u.id === adminUserId || u.username === adminUsername);
      assert(Boolean(adminRecord), `Found admin user ${adminUsername} in admin response`);
      assert(adminRecord.is_admin === true, 'Admin user is_admin is true');
      assert(typeof adminRecord.total_habits === 'number', 'Admin user has valid total_habits count');
      assert(typeof adminRecord.total_todos === 'number', 'Admin user has valid total_todos count');

      console.log('\n======================================================');
      console.log(`=== ALL TESTS PASSED: ${passedTests}/${totalTests} ===`);
      console.log('======================================================\n');
    } finally {
      await pool.end();
      serverProc.kill();
    }
  }

  let serverStarted = false;
  serverProc.stdout.on('data', async (data) => {
    const output = data.toString();
    if (output.includes('HabitTrack server running') && !serverStarted) {
      serverStarted = true;
      try {
        await runTests();
        process.exit(0);
      } catch (err) {
        console.error('\n❌ Admin test suite failed:', err);
        process.exit(1);
      }
    }
  });

  serverProc.stderr.on('data', (data) => {
    const str = data.toString();
    if (!str.includes('ExperimentalWarning')) {
      console.error('Server stderr:', str);
    }
  });

  serverProc.on('exit', (code) => {
    if (code !== 0 && code !== null && !serverStarted) {
      console.error(`Server process exited prematurely with code ${code}`);
      process.exit(1);
    }
  });
}

startSuite().catch((err) => {
  console.error('Failed to start test suite:', err);
  process.exit(1);
});
