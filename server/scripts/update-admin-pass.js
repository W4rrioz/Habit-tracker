import bcrypt from 'bcryptjs';
import { query, pool } from '../lib/db.js';

async function updatePassword() {
  const username = 'admin';
  const newPassword = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);
  
  await query('UPDATE users SET password_hash = $1, is_admin = true WHERE username = $2', [hash, username]);
  console.log(`Password for user "${username}" updated to "${newPassword}".`);
  await pool.end();
}

updatePassword();
