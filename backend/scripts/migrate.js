/**
 * Creates the `notifications` table, the `user_roles` table, and the
 * `users.active_role` column if they don't already exist — then backfills
 * `active_role`/`user_roles` for any pre-existing accounts so nothing that
 * already worked (single-role login, admin checks, etc.) breaks. Safe to
 * run multiple times (catches Oracle's "already exists" errors).
 *
 * Usage (from backend/):
 *   node scripts/migrate.js
 */
const { initializePool, getConnection, closePool } = require('../config/db');

const ORA_NAME_IN_USE = 955;   // ORA-00955: name is already used by an existing object
const ORA_COLUMN_EXISTS = 1430; // ORA-01430: column being added already exists in table

async function run() {
  await initializePool();
  const connection = await getConnection();
  try {
    try {
      await connection.execute(
        `
        CREATE TABLE notifications (
          notification_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id          NUMBER NOT NULL REFERENCES users(user_id),
          type              VARCHAR2(50) NOT NULL,
          title             VARCHAR2(200) NOT NULL,
          body              VARCHAR2(500),
          data              VARCHAR2(1000),
          is_read           NUMBER(1) DEFAULT 0 NOT NULL,
          created_at        TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
        )
        `,
        {},
        { autoCommit: true },
      );
      console.log('Created table: notifications');
    } catch (err) {
      if (err.errorNum === ORA_NAME_IN_USE) {
        console.log('Table notifications already exists — skipping.');
      } else {
        throw err;
      }
    }

    try {
      await connection.execute(
        `CREATE INDEX idx_notifications_user ON notifications (user_id, created_at)`,
        {},
        { autoCommit: true },
      );
      console.log('Created index: idx_notifications_user');
    } catch (err) {
      if (err.errorNum === ORA_NAME_IN_USE) {
        console.log('Index idx_notifications_user already exists — skipping.');
      } else {
        throw err;
      }
    }

    // --- Multi-Role User System ---
    try {
      await connection.execute(
        `ALTER TABLE users ADD active_role VARCHAR2(20)`,
        {},
        { autoCommit: true },
      );
      console.log('Added column: users.active_role');
    } catch (err) {
      if (err.errorNum === ORA_COLUMN_EXISTS) {
        console.log('Column users.active_role already exists — skipping.');
      } else {
        throw err;
      }
    }

    try {
      await connection.execute(
        `
        CREATE TABLE user_roles (
          user_role_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id       NUMBER NOT NULL REFERENCES users(user_id),
          role          VARCHAR2(20) NOT NULL,
          created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
          CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role)
        )
        `,
        {},
        { autoCommit: true },
      );
      console.log('Created table: user_roles');
    } catch (err) {
      if (err.errorNum === ORA_NAME_IN_USE) {
        console.log('Table user_roles already exists — skipping.');
      } else {
        throw err;
      }
    }

    // Backfill: every existing account gets a user_roles row matching its
    // current `role`, and active_role set to that same role — so a user who
    // registered before this migration keeps working exactly as before.
    const backfillRoles = await connection.execute(
      `
      INSERT INTO user_roles (user_id, role)
      SELECT u.user_id, u.role
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.user_id = u.user_id AND ur.role = u.role
      )
      `,
      {},
      { autoCommit: true },
    );
    console.log(`Backfilled user_roles for ${backfillRoles.rowsAffected ?? 0} account(s).`);

    const backfillActive = await connection.execute(
      `UPDATE users SET active_role = role WHERE active_role IS NULL`,
      {},
      { autoCommit: true },
    );
    console.log(`Backfilled active_role for ${backfillActive.rowsAffected ?? 0} account(s).`);

    // --- Editable profile: photo + cover photo ---
    try {
      await connection.execute(
        `ALTER TABLE profiles ADD (profile_photo CLOB, cover_photo CLOB)`,
        {},
        { autoCommit: true },
      );
      console.log('Added columns: profiles.profile_photo, profiles.cover_photo');
    } catch (err) {
      if (err.errorNum === ORA_COLUMN_EXISTS) {
        console.log('Columns profiles.profile_photo/cover_photo already exist — skipping.');
      } else {
        throw err;
      }
    }
  } finally {
    await connection.close();
    await closePool();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
});
