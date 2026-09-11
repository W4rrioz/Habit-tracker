import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('Testing Supabase URL:', process.env.SUPABASE_URL);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

try {
  // Test query
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.log('Supabase API responded with:', error.code, error.message);
  } else {
    console.log('Supabase API SUCCESS. Rows:', data);
  }
} catch (err) {
  console.error('Supabase API Fetch Error:', err);
}
