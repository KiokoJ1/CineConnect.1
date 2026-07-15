const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

function mapCredit(row) {
  if (!row) return null;
  return {
    creditId:    row.CREDIT_ID,
    userId:      row.USER_ID,
    title:       row.TITLE,
    role:        row.ROLE,
    year:        row.YEAR,
    creditType:  row.CREDIT_TYPE,
    description: row.DESCRIPTION,
    createdAt:   row.CREATED_AT,
  };
}

async function findById(creditId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT credit_id, user_id, title, role, year, credit_type, description, created_at
       FROM film_credits
       WHERE credit_id = :creditId`,
      { creditId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return mapCredit(result.rows[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function findByUserId(userId, limit = 50, offset = 0) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT credit_id, user_id, title, role, year, credit_type, description, created_at
       FROM film_credits
       WHERE user_id = :userId
       ORDER BY created_at DESC
       OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
      { userId, offset, limit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.map(mapCredit);
  } finally {
    if (connection) await connection.close();
  }
}

async function createCredit(userId, data) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO film_credits (user_id, title, role, year, credit_type, description)
       VALUES (:userId, :title, :role, :year, :creditType, :description)
       RETURNING credit_id INTO :creditId`,
      {
        userId,
        title: data.title,
        role: data.role,
        year: data.year,
        creditType: data.creditType,
        description: data.description,
        creditId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true },
    );
    return findById(result.outBinds.creditId[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function deleteCredit(creditId, userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM film_credits WHERE credit_id = :creditId AND user_id = :userId`,
      { creditId, userId },
      { autoCommit: true },
    );
    return result.rowsAffected || 0;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { createCredit, deleteCredit, findById, findByUserId };

