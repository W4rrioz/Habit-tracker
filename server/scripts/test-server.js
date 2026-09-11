import http from 'http';
import { spawn } from 'child_process';

const serverProc = spawn('node', ['server/index.js'], { stdio: 'pipe' });

serverProc.stdout.on('data', async (d) => {
  const str = d.toString();
  console.log('[SERVER STDOUT]:', str.trim());
  if (str.includes('HabitTrack server running')) {
    try {
      const res = await fetch('http://localhost:3001/api/health');
      const json = await res.json();
      console.log('HEALTH_CHECK_RESULT:', json);
    } catch (e) {
      console.error('HEALTH_CHECK_ERROR:', e);
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
  console.error('Timeout waiting for server');
  serverProc.kill();
  process.exit(1);
}, 10000);
