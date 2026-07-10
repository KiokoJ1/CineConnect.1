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
        SELECT user_id, full_name, email, phone_number, role, password_hash, created_at, status, updated_at
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
        SELECT user_id, full_name, email, phone_number, role, password_hash, created_at, status, updated_at
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
        INSERT INTO users (full_name, email, password_hash, phone_number, role)
        VALUES (:fullName, LOWER(:email), :passwordHash, :phoneNumber, :role)
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

module.exports = {
  createUser,
  findByEmail,
  findById,
  countAll,
  countsByRole,
  findAll,
  updateStatus,
};
