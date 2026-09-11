import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initDb, query } from './lib/db.js';
import authRouter from './routes/auth.js';
import habitsRouter from './routes/habits.js';
import todosRouter from './routes/todos.js';
import timerRouter from './routes/timer.js';
import journalRouter from './routes/journal.js';
import leaderboardRouter from './routes/leaderboard.js';
import adminRouter from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET || 'habittrack-dev-secret'));

// Mount API routers
app.use('/api/auth', authRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/todos', todosRouter);
app.use('/api/timer', timerRouter);
app.use('/api/journal', journalRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const dbRes = await query('SELECT NOW() as now;');
    res.json({
      status: 'ok',
      app: 'HabitTrack',
      database: 'connected',
      timestamp: dbRes.rows[0].now
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Serve static frontend files when built
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('HabitTrack API Server is running. In dev mode, access the React UI on port 5173.');
    }
  });
});

try {
  await initDb();
  app.listen(PORT, () => {
    console.log(`HabitTrack server running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}

export default app;

