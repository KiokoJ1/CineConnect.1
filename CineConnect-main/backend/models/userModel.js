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
    // The role currently "switched on" for this user. Falls back to `role`
    // for any row where the multi-role migration hasn't backfilled it yet.
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
    await connection.execute(
      `INSERT INTO user_roles (user_id, role) VALUES (:id, :role)`,
      { id, role },
      { autoCommit: true },
    );

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

async function findAll({ role, search } = {}) {
  let connection;
  try {
    connection = await getConnection();
    const conditions = [];
    const binds = {};

    if (role) {
      conditions.push('LOWER(role) = LOWER(:role)');
      binds.role = role;
    }
    if (search) {
      conditions.push('LOWER(full_name) LIKE LOWER(:search)');
      binds.search = `%${search}%`;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await connection.execute(
      `
        SELECT user_id, full_name, email, phone_number, role, status, created_at, updated_at
        FROM users
        ${where}
        ORDER BY created_at DESC
        FETCH FIRST 200 ROWS ONLY
      `,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return result.rows.map(mapUser);
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

const ORA_UNIQUE_VIOLATED = 1; // ORA-00001: unique constraint violated

/** All roles this user is allowed to switch into, lowercase, e.g. ['client', 'freelancer', 'producer']. */
async function getRoles(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT role FROM user_roles WHERE user_id = :userId ORDER BY role`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.map((r) => String(r.ROLE).toLowerCase());
  } finally {
    if (connection) await connection.close();
  }
}

/** Grants an additional role to a user (idempotent — granting a role they already have is a no-op). */
async function addRole(userId, role) {
  let connection;
  try {
    connection = await getConnection();
    try {
      await connection.execute(
        `INSERT INTO user_roles (user_id, role) VALUES (:userId, :role)`,
        { userId, role },
        { autoCommit: true },
      );
    } catch (err) {
      if (err.errorNum !== ORA_UNIQUE_VIOLATED) throw err;
    }
  } finally {
    if (connection) await connection.close();
  }
}

/** Switches which of the user's granted roles is active. Caller is responsible for checking `role` is one of `getRoles(userId)` first. */
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
  getRoles,
  addRole,
  setActiveRole,
};
