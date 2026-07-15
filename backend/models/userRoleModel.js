const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

const ORA_UNIQUE_VIOLATION = 1; // ORA-00001: unique constraint violated

/** Every role this user currently holds, e.g. ['freelancer', 'producer']. */
async function findRolesByUser(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT role FROM user_roles WHERE user_id = :userId ORDER BY created_at ASC`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.map((r) => r.ROLE);
  } finally {
    if (connection) await connection.close();
  }
}

async function hasRole(userId, role) {
  const roles = await findRolesByUser(userId);
  return roles.includes(role);
}

/** Grants a role to an account. Idempotent — adding a role the user already has is a no-op, not an error. */
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
      if (err.errorNum !== ORA_UNIQUE_VIOLATION) throw err;
      // Already has this role — fine, nothing to do.
    }
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { findRolesByUser, hasRole, addRole };
