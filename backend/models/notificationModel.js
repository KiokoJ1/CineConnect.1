const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

function mapNotification(row) {
  if (!row) return null;
  return {
    id: row.NOTIFICATION_ID,
    userId: row.USER_ID,
    type: row.TYPE,
    title: row.TITLE,
    body: row.BODY,
    data: row.DATA,
    isRead: Number(row.IS_READ) === 1,
    createdAt: row.CREATED_AT,
  };
}

async function create({ userId, type, title, body, data }) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (:userId, :type, :title, :body, :data)
        RETURNING notification_id INTO :notificationId
      `,
      {
        userId,
        type,
        title,
        body: body ?? null,
        data: data ? JSON.stringify(data) : null,
        notificationId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true },
    );
    return findById(result.outBinds.notificationId[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function findById(notificationId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT * FROM notifications WHERE notification_id = :notificationId`,
      { notificationId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return mapNotification(result.rows[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function findByUser(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        SELECT * FROM notifications
        WHERE user_id = :userId
        ORDER BY created_at DESC
        FETCH FIRST 100 ROWS ONLY
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.map(mapNotification);
  } finally {
    if (connection) await connection.close();
  }
}

async function markAllRead(userId) {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `UPDATE notifications SET is_read = 1 WHERE user_id = :userId AND is_read = 0`,
      { userId },
      { autoCommit: true },
    );
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { create, findById, findByUser, markAllRead };
