/**
 * Creates the `notifications` table if it doesn't already exist. Safe to run
 * multiple times (catches Oracle's "name already used" error).
 *
 * Usage (from backend/):
 *   node scripts/migrate.js
 */
const { initializePool, getConnection, closePool } = require('../config/db');

const ORA_NAME_IN_USE = 955; // ORA-00955: name is already used by an existing object

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
  } finally {
    await connection.close();
    await closePool();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
});
