import { spawn } from 'child_process';

const serverProc = spawn('node', ['server/index.js'], { stdio: 'pipe' });

serverProc.stdout.on('data', async (d) => {
  const str = d.toString();
  console.log('[SERVER STDOUT]:', str.trim());
  if (str.includes('HabitTrack server running')) {
    try {
      // 1. Check API health
      const apiRes = await fetch('http://localhost:3001/api/health');
      const apiJson = await apiRes.json();
      console.log('HEALTH_API_SUCCESS:', apiJson);

      // 2. Check Static frontend HTML serving
      const htmlRes = await fetch('http://localhost:3001/');
      const htmlText = await htmlRes.text();
      const hasTitle = htmlText.includes('HabitTrack');
      console.log('FRONTEND_SERVE_SUCCESS:', hasTitle ? 'Serving HabitTrack HTML' : 'Title missing');

      // 3. Check client-side route fallback serving
      const routeRes = await fetch('http://localhost:3001/habits');
      const routeText = await routeRes.text();
      const hasRouteHtml = routeText.includes('HabitTrack');
      console.log('SPA_ROUTE_FALLBACK_SUCCESS:', hasRouteHtml ? 'SPA Fallback works' : 'Fallback missing');
    } catch (e) {
      console.error('TEST_FAILED:', e);
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
  console.error('Test timeout');
  serverProc.kill();
  process.exit(1);
}, 12000);
