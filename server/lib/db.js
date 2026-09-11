import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// Ensure DATE columns (oid 1082) are returned as 'YYYY-MM-DD' strings without timezone shift
pg.types.setTypeParser(1082, (val) => val);

function formatConnectionString(uri) {
  if (!uri) return uri;
  try {
    new URL(uri);
    return uri;
  } catch (e) {
    const match = uri.match(/^(postgres(?:ql)?:\/\/[^:]+:)(.*)(@[^@]+)$/);
    if (match) {
      const userPart = match[1];
      const password = match[2];
      const hostPart = match[3];
      const fixedPassword = password.replace(/#/g, '%23');
      return userPart + fixedPassword + hostPart;
    }
    return uri;
  }
}

const rawConnectionString = process.env.DATABASE_URL;
const connectionString = formatConnectionString(rawConnectionString);

if (!connectionString) {
  console.error('\n❌ CRITICAL: DATABASE_URL environment variable is missing!');
  console.error('Please add DATABASE_URL in your Render dashboard under "Environment".\n');
}

export const pool = new pg.Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});



pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function initDb() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW() as now, version();');
    console.log('PostgreSQL connected to Supabase:', res.rows[0].now);
    return true;
  } finally {
    client.release();
  }
}
