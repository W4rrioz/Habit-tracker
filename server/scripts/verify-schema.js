import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position;
  `);

  const summary = {};
  res.rows.forEach(r => {
    summary[r.table_name] = summary[r.table_name] || [];
    summary[r.table_name].push(r.column_name + ' (' + r.data_type + (r.is_nullable === 'NO' ? ', NOT NULL' : '') + ')');
  });

  console.log('=== SCHEMA SUMMARY ===');
  for (const [tbl, cols] of Object.entries(summary)) {
    console.log(tbl + ':');
    cols.forEach(c => console.log('  - ' + c));
  }

  // Check unique constraints and indexes
  const idx = await client.query(`
    SELECT tablename, indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    ORDER BY tablename, indexname;
  `);
  console.log('\n=== INDEXES ===');
  idx.rows.forEach(i => console.log(i.tablename + ' -> ' + i.indexname));

  await client.end();
}

verify().catch(console.error);
