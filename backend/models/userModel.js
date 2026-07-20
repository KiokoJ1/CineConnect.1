const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.USER_ID,
    fullName: row.FULL_NAME,
    email: row.EMAIL,
    passwordHash: row.PASSWORD_HASH,
    phoneNumber: row.PHONE_NUMBER,
    role: row.ROLE,
    // Falls back to `role` for any row where the multi-role migration
    // hasn't run yet / hasn't backfilled this account — keeps every
    // existing single-role account working unchanged either way.
    activeRole: row.ACTIVE_ROLE || row.ROLE,
    status: row.STATUS,
    createdAt: row.CREATED_AT,
    updatedAt: row.UPDATED_AT,
  };
}

async function findByEmail(email) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        SELECT user_id, full_name, email, phone_number, role, active_role, password_hash, created_at, status, updated_at
        FROM users
        WHERE LOWER(email) = LOWER(:email)
      `,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return mapUser(result.rows[0]);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function findById(id) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        SELECT user_id, full_name, email, phone_number, role, active_role, password_hash, created_at, status, updated_at
        FROM users
        WHERE user_id = :id
      `,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return mapUser(result.rows[0]);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function createUser({ fullName, email, passwordHash, phoneNumber, role }) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        INSERT INTO users (full_name, email, password_hash, phone_number, role, active_role)
        VALUES (:fullName, LOWER(:email), :passwordHash, :phoneNumber, :role, :role)
        RETURNING user_id INTO :id
      `,
      {
        fullName,
        email,
        passwordHash,
        phoneNumber,
        role,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true },
    );

    const id = result.outBinds.id[0];
    return findById(id);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function countAll() {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM users`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return Number(result.rows[0]?.CNT ?? 0);
  } finally {
    if (connection) await connection.close();
  }
}

/** Returns e.g. { producer: 4, freelancer: 12, client: 1, admin: 1 }. */
async function countsByRole() {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT role, COUNT(*) AS cnt FROM users GROUP BY role`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const counts = {};
    for (const row of result.rows) {
      counts[String(row.ROLE).toLowerCase()] = Number(row.CNT);
    }
    return counts;
  } finally {
    if (connection) await connection.close();
  }
}

const MAX_LIMIT = 100;

/**
 * User search/filter/pagination — powers GET /api/users (discovery, Browse
 * Talent) and GET /api/admin/users.
 *
 * `search` matches name, skills, OR location (profiles are LEFT JOINed —
 * users without a profile row still match on name). `skills`/`location`
 * are separate, narrower filters for when a caller wants just one of those
 * dimensions rather than a broad OR match.
 *
 * Backward compatible by default: existing callers that don't pass
 * page/limit get `limit = 200` (the same cap this endpoint always had), so
 * nothing that worked before changes unless a caller opts into real
 * pagination by passing `page`/`limit` explicitly.
 */
async function findAll({ role, search, skills, location, page, limit } = {}) {
  let connection;
  try {
    connection = await getConnection();
    const conditions = [];
    const binds = {};

    if (role) {
      conditions.push('LOWER(u.role) = LOWER(:role)');
      binds.role = role;
    }
    if (search) {
      conditions.push(
        '(LOWER(u.full_name) LIKE LOWER(:search) OR LOWER(p.skills) LIKE LOWER(:search) OR LOWER(p.location) LIKE LOWER(:search))',
      );
      binds.search = `%${search}%`;
    }
    if (skills) {
      conditions.push('LOWER(p.skills) LIKE LOWER(:skills)');
      binds.skills = `%${skills}%`;
    }
    if (location) {
      conditions.push('LOWER(p.location) LIKE LOWER(:location)');
      binds.location = `%${location}%`;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const fromClause = `FROM users u LEFT JOIN profiles p ON p.user_id = u.user_id ${where}`;

    // No explicit limit -> preserve the old unpaginated cap (200) exactly.
    // Explicit limit -> real pagination, capped at MAX_LIMIT so a caller
    // can't request an unbounded page.
    const effectiveLimit = limit ? Math.min(Number(limit), MAX_LIMIT) : 200;
    const effectivePage = Math.max(Number(page) || 1, 1);
    const offset = (effectivePage - 1) * effectiveLimit;

    const [countResult, rowsResult] = await Promise.all([
      connection.execute(
        `SELECT COUNT(*) AS cnt ${fromClause}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      ),
      connection.execute(
        `
          SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role, u.active_role, u.status, u.created_at, u.updated_at
          ${fromClause}
          ORDER BY u.created_at DESC
          OFFSET :offset ROWS FETCH NEXT :effectiveLimit ROWS ONLY
        `,
        { ...binds, offset, effectiveLimit },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      ),
    ]);

    const total = Number(countResult.rows[0]?.CNT ?? 0);
    return {
      users: rowsResult.rows.map(mapUser),
      total,
      page: effectivePage,
      limit: effectiveLimit,
      totalPages: Math.max(Math.ceil(total / effectiveLimit), 1),
    };
  } finally {
    if (connection) await connection.close();
  }
}

async function updateStatus(id, status) {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `UPDATE users SET status = :status, updated_at = SYSTIMESTAMP WHERE user_id = :id`,
      { status, id },
      { autoCommit: true },
    );
    return findById(id);
  } finally {
    if (connection) await connection.close();
  }
}

async function setActiveRole(userId, role) {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `UPDATE users SET active_role = :role, updated_at = SYSTIMESTAMP WHERE user_id = :userId`,
      { role, userId },
      { autoCommit: true },
    );
    return findById(userId);
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  countAll,
  countsByRole,
  findAll,
  updateStatus,
  setActiveRole,
};
