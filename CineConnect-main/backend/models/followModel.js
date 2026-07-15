const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

async function follow(followerId, followedId) {
  let connection;
  try {
    connection = await getConnection();
    try {
      await connection.execute(
        `INSERT INTO follows (follower_id, followed_id) VALUES (:followerId, :followedId)`,
        { followerId, followedId },
        { autoCommit: true },
      );
    } catch (err) {
      if (err.errorNum !== 1) throw err; // ORA-00001: already following — idempotent no-op
    }
  } finally {
    if (connection) await connection.close();
  }
}

async function unfollow(followerId, followedId) {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `DELETE FROM follows WHERE follower_id = :followerId AND followed_id = :followedId`,
      { followerId, followedId },
      { autoCommit: true },
    );
  } finally {
    if (connection) await connection.close();
  }
}

async function isFollowing(followerId, followedId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT 1 FROM follows WHERE follower_id = :followerId AND followed_id = :followedId`,
      { followerId, followedId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.length > 0;
  } finally {
    if (connection) await connection.close();
  }
}

async function getCounts(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT
         (SELECT COUNT(*) FROM follows WHERE followed_id = :userId) AS followers,
         (SELECT COUNT(*) FROM follows WHERE follower_id = :userId) AS following
       FROM dual`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return {
      followers: Number(result.rows[0]?.FOLLOWERS ?? 0),
      following: Number(result.rows[0]?.FOLLOWING ?? 0),
    };
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { follow, unfollow, isFollowing, getCounts };
