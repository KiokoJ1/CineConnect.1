/**
 * Creates (or repairs) the fixed admin account used to sign into the Admin
 * panel: email "admin", password "admin". Public /api/auth/register
 * deliberately refuses role="admin" (see services/authService.js), so this
 * account has to be seeded directly — this script does that idempotently.
 *
 * Usage (from backend/):
 *   node scripts/seedAdmin.js
 */
const bcrypt = require('bcryptjs');
const oracledb = require('oracledb');
const { initializePool, getConnection, closePool } = require('../config/db');

const ADMIN_EMAIL = 'admin';
const ADMIN_PASSWORD = 'admin';
const SALT_ROUNDS = 12;

async function run() {
  await initializePool();
  const connection = await getConnection();
  try {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

    const existing = await connection.execute(
      `SELECT user_id FROM users WHERE LOWER(email) = LOWER(:email)`,
      { email: ADMIN_EMAIL },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    if (existing.rows.length > 0) {
      // Already exists — make sure it's still a working admin login rather
      // than skipping (covers a stale password hash or accidental suspend).
      await connection.execute(
        `UPDATE users
         SET password_hash = :passwordHash, role = 'admin', status = 'active', updated_at = SYSTIMESTAMP
         WHERE LOWER(email) = LOWER(:email)`,
        { passwordHash, email: ADMIN_EMAIL },
        { autoCommit: true },
      );
      console.log(`Updated existing "${ADMIN_EMAIL}" account to a working admin login.`);
      return;
    }

    await connection.execute(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role, status)
       VALUES ('Admin', :email, :passwordHash, NULL, 'admin', 'active')`,
      { email: ADMIN_EMAIL, passwordHash },
      { autoCommit: true },
    );
    console.log(`Created admin account: email="${ADMIN_EMAIL}", password="${ADMIN_PASSWORD}".`);
  } finally {
    await connection.close();
    await closePool();
  }
}

run().catch((err) => {
  console.error('Failed to seed admin account:', err.message);
  process.exitCode = 1;
});
