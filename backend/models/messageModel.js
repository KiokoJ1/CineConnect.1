const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

function mapMessage(row) {
  if (!row) return null;
  return {
    messageId:     row.MESSAGE_ID,
    projectId:     row.PROJECT_ID     ?? null,
    projectTitle:  row.PROJECT_TITLE  ?? null,
    senderId:      row.SENDER_ID,
    senderName:    row.SENDER_NAME,
    recipientId:   row.RECIPIENT_ID,
    recipientName: row.RECIPIENT_NAME,
    body:          row.BODY,
    isRead:        row.IS_READ === 1,
    sentAt:        row.SENT_AT,
  };
}

const SELECT = `
  SELECT m.message_id, m.project_id, p.title AS project_title,
         m.sender_id,    us.full_name AS sender_name,
         m.recipient_id, ur.full_name AS recipient_name,
         m.body, m.is_read, m.sent_at
  FROM messages m
  LEFT JOIN projects p ON p.project_id = m.project_id
  JOIN users us ON us.user_id = m.sender_id
  JOIN users ur ON ur.user_id = m.recipient_id
`;

async function sendMessage(data) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO messages (project_id, sender_id, recipient_id, body)
       VALUES (:projectId, :senderId, :recipientId, :body)
       RETURNING message_id INTO :messageId`,
      {
        projectId:   data.projectId || null,
        senderId:    data.senderId,
        recipientId: data.recipientId,
        body:        data.body,
        messageId:   { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true },
    );
    return findById(result.outBinds.messageId[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function findById(messageId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `${SELECT} WHERE m.message_id = :messageId`,
      { messageId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return mapMessage(result.rows[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function getThread(userId, otherUserId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `${SELECT}
       WHERE (m.sender_id = :userId AND m.recipient_id = :otherId)
          OR (m.sender_id = :otherId AND m.recipient_id = :userId)
       ORDER BY m.sent_at ASC`,
      { userId, otherId: otherUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.map(mapMessage);
  } finally {
    if (connection) await connection.close();
  }
}

async function getInbox(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `${SELECT}
       WHERE m.recipient_id = :userId OR m.sender_id = :userId
       ORDER BY m.sent_at DESC
       FETCH FIRST 50 ROWS ONLY`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.map(mapMessage);
  } finally {
    if (connection) await connection.close();
  }
}

async function markRead(messageId, userId) {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `UPDATE messages SET is_read = 1
       WHERE message_id = :messageId AND recipient_id = :userId`,
      { messageId, userId },
      { autoCommit: true },
    );
  } finally {
    if (connection) await connection.close();
  }
}

async function unreadCount(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM messages
       WHERE recipient_id = :userId AND is_read = 0`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return Number(result.rows[0]?.CNT ?? 0);
  } finally {
    if (connection) await connection.close();
  }
}

async function markThreadRead(userId, otherUserId) {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `UPDATE messages SET is_read = 1
       WHERE recipient_id = :userId AND sender_id = :otherUserId AND is_read = 0`,
      { userId, otherUserId },
      { autoCommit: true },
    );
  } finally {
    if (connection) await connection.close();
  }
}

async function countAll() {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM messages`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return Number(result.rows[0]?.CNT ?? 0);
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { sendMessage, findById, getThread, getInbox, markRead, markThreadRead, unreadCount, countAll };
