import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('Connecting to:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@') : 'undefined');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  const res = await client.query('SELECT NOW() as now, version();');
  console.log('DB_SUCCESS:', res.rows[0]);
  await client.end();
} catch (err) {
  console.error('DB_ERROR:', err);
  process.exit(1);
}
