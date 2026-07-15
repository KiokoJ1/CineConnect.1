/**
 * Creates the `notifications` table if it doesn't already exist. Safe to run
 * multiple times (catches Oracle's "name already used" error).
 *
 * Usage (from backend/):
 *   node scripts/migrate.js
 */
const { initializePool, getConnection, closePool } = require('../config/db');

const ORA_NAME_IN_USE = 955;         // ORA-00955: name is already used by an existing object
const ORA_COLUMN_EXISTS = 1430;      // ORA-01430: column being added already exists in table

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

    // --- Multi-Role User System -------------------------------------------
    // USERS.ACTIVE_ROLE tracks which of a user's granted roles is currently
    // "on" (what drives navigation/permissions this session); USER_ROLES is
    // the many-to-many table of every role a user is allowed to switch into.
    // `role` on USERS is left untouched — it stays the role chosen at
    // registration and is what both new columns are seeded from below, so
    // existing authentication and every pre-existing `user.role`/
    // `requireRole()` check keeps working unchanged.
    try {
      await connection.execute(
        `ALTER TABLE users ADD (active_role VARCHAR2(20))`,
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
          user_id      NUMBER NOT NULL REFERENCES users(user_id),
          role         VARCHAR2(20) NOT NULL,
          created_at   TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
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

    const backfillActiveRole = await connection.execute(
      `UPDATE users SET active_role = role WHERE active_role IS NULL`,
      {},
      { autoCommit: true },
    );
    console.log(`Backfilled active_role for ${backfillActiveRole.rowsAffected ?? 0} user(s).`);

    const backfillUserRoles = await connection.execute(
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
    console.log(`Backfilled user_roles for ${backfillUserRoles.rowsAffected ?? 0} user(s).`);

    // --- Editable profile: photo + cover photo -----------------------------
    // Stored as CLOB (not VARCHAR2) because they hold data: URIs (base64
    // image data) — there's no object-storage/CDN configured for this
    // project, so the image bytes live directly in Oracle, same spirit as
    // every other profile field. See PROFILE_EDITING.md.
    try {
      await connection.execute(
        `ALTER TABLE profiles ADD (avatar_url CLOB, cover_url CLOB)`,
        {},
        { autoCommit: true },
      );
      console.log('Added columns: profiles.avatar_url, profiles.cover_url');
    } catch (err) {
      if (err.errorNum === ORA_COLUMN_EXISTS) {
        console.log('Columns profiles.avatar_url/cover_url already exist — skipping.');
      } else {
        throw err;
      }
    }
    // --- Portfolio: images, videos, featured work --------------------------
    // One row per media item. Images may be a data: URI (picked on-device,
    // same as the profile/cover photo — see PROFILE_EDITING.md) or an http(s)
    // URL; videos are always an http(s) URL (YouTube/Vimeo/hosted link) —
    // embedding raw video bytes in Oracle isn't practical at any reasonable
    // size. `is_featured` powers the "Featured Work" section.
    try {
      await connection.execute(
        `
        CREATE TABLE portfolio_items (
          portfolio_item_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id       NUMBER NOT NULL REFERENCES users(user_id),
          media_type    VARCHAR2(10) NOT NULL,
          media_url     CLOB NOT NULL,
          thumbnail_url CLOB,
          title         VARCHAR2(200),
          description   VARCHAR2(1000),
          is_featured   NUMBER(1) DEFAULT 0 NOT NULL,
          sort_order    NUMBER DEFAULT 0 NOT NULL,
          created_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
          CONSTRAINT chk_portfolio_media_type CHECK (media_type IN ('image', 'video'))
        )
        `,
        {},
        { autoCommit: true },
      );
      console.log('Created table: portfolio_items');
    } catch (err) {
      if (err.errorNum === ORA_NAME_IN_USE) {
        console.log('Table portfolio_items already exists — skipping.');
      } else {
        throw err;
      }
    }

    try {
      await connection.execute(
        `CREATE INDEX idx_portfolio_items_user ON portfolio_items (user_id, is_featured, created_at)`,
        {},
        { autoCommit: true },
      );
      console.log('Created index: idx_portfolio_items_user');
    } catch (err) {
      if (err.errorNum === ORA_NAME_IN_USE) {
        console.log('Index idx_portfolio_items_user already exists — skipping.');
      } else {
        throw err;
      }
    }
    // --- Social: Follow / Unfollow ------------------------------------------
    try {
      await connection.execute(
        `
        CREATE TABLE follows (
          follower_id NUMBER NOT NULL REFERENCES users(user_id),
          followed_id NUMBER NOT NULL REFERENCES users(user_id),
          created_at  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
          CONSTRAINT pk_follows PRIMARY KEY (follower_id, followed_id),
          CONSTRAINT chk_follows_not_self CHECK (follower_id != followed_id)
        )
        `,
        {},
        { autoCommit: true },
      );
      console.log('Created table: follows');
    } catch (err) {
      if (err.errorNum === ORA_NAME_IN_USE) {
        console.log('Table follows already exists — skipping.');
      } else {
        throw err;
      }
    }

    try {
      await connection.execute(
        `CREATE INDEX idx_follows_followed ON follows (followed_id)`,
        {},
        { autoCommit: true },
      );
      console.log('Created index: idx_follows_followed');
    } catch (err) {
      if (err.errorNum === ORA_NAME_IN_USE) {
        console.log('Index idx_follows_followed already exists — skipping.');
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
