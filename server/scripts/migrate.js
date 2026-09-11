import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sqlPath = path.resolve(__dirname, '../migrations/001_create_schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8').replace(/^\uFEFF/, '');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Running migration: 001_create_schema.sql ...');
  await client.query(sql);
  console.log('Migration executed successfully.');

  // Verify all 7 tables exist
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
      'users', 'habits', 'habit_checkins', 
      'todos', 'todo_completions', 
      'journal_entries', 'timer_sessions'
    )
    ORDER BY table_name;
  `);

  console.log('Verified tables in public schema:');
  res.rows.forEach(r => console.log(' - ' + r.table_name));

  if (res.rows.length === 7) {
    console.log('ALL 7 TABLES VERIFIED SUCCESSFULLY!');
  } else {
    console.error(`Expected 7 tables, found ${res.rows.length}`);
    process.exit(1);
  }

  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
