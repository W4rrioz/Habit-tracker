import bcrypt from 'bcryptjs';
import { query, pool } from '../lib/db.js';

async function seedAdmin() {
  const username = 'admin';
  const password = 'AdminPassword123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  try {
    const existing = await query('SELECT id, username, is_admin FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      await query(
        'UPDATE users SET password_hash = $1, is_admin = true WHERE id = $2',
        [passwordHash, existing.rows[0].id]
      );
      console.log(`[Admin Seed] Updated existing "${username}" user to admin role.`);
    } else {
      const res = await query(
        'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, true) RETURNING id, username, is_admin',
        [username, passwordHash]
      );
      console.log(`[Admin Seed] Created new admin user "${username}" (ID: ${res.rows[0].id}).`);
    }

    console.log('SUCCESS: Admin user seeded successfully.');
  } catch (err) {
    console.error('Failed to seed admin:', err);
  } finally {
    await pool.end();
  }
}

seedAdmin();
