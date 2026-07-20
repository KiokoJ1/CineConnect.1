const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

const ORA_UNIQUE_VIOLATION = 1; // ORA-00001: unique constraint violated

async function isFollowing(followerId, followeeId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT 1 FROM follows WHERE follower_id = :followerId AND followee_id = :followeeId`,
      { followerId, followeeId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.length > 0;
  } finally {
    if (connection) await connection.close();
  }
}

async function countFollowers(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM follows WHERE followee_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return Number(result.rows[0]?.CNT ?? 0);
  } finally {
    if (connection) await connection.close();
  }
}

async function countFollowing(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM follows WHERE follower_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return Number(result.rows[0]?.CNT ?? 0);
  } finally {
    if (connection) await connection.close();
  }
}

/** Idempotent — following someone you already follow is a no-op, not an error. */
async function follow(followerId, followeeId) {
  let connection;
  try {
    connection = await getConnection();
    try {
      await connection.execute(
        `INSERT INTO follows (follower_id, followee_id) VALUES (:followerId, :followeeId)`,
        { followerId, followeeId },
        { autoCommit: true },
      );
    } catch (err) {
      if (err.errorNum !== ORA_UNIQUE_VIOLATION) throw err;
      // Already following — fine, nothing to do.
    }
  } finally {
    if (connection) await connection.close();
  }
}

async function unfollow(followerId, followeeId) {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `DELETE FROM follows WHERE follower_id = :followerId AND followee_id = :followeeId`,
      { followerId, followeeId },
      { autoCommit: true },
    );
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { isFollowing, countFollowers, countFollowing, follow, unfollow };
