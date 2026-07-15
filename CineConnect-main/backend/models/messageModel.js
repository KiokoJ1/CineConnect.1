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

/**
 * One row per conversation "thread" (a thread is uniquely identified by the
 * other participant, since there's no separate conversations table — a
 * conversation is simply the set of messages between two users). Returns
 * the latest message per partner plus how many of their messages to this
 * user are still unread, ordered by most recent activity first. Powers the
 * Chats list (requirement: "display the latest message and time in the
 * chat preview").
 */
async function getConversations(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        SELECT
          other.other_user_id,
          u.full_name AS other_user_name,
          latest.message_id,
          latest.body,
          latest.sent_at,
          latest.sender_id AS last_sender_id,
          latest.is_read AS last_is_read,
          (
            SELECT COUNT(*) FROM messages m2
            WHERE m2.sender_id = other.other_user_id
              AND m2.recipient_id = :userId
              AND m2.is_read = 0
          ) AS unread_count
        FROM (
          SELECT DISTINCT
            CASE WHEN sender_id = :userId THEN recipient_id ELSE sender_id END AS other_user_id
          FROM messages
          WHERE sender_id = :userId OR recipient_id = :userId
        ) other
        JOIN users u ON u.user_id = other.other_user_id
        CROSS APPLY (
          SELECT m.message_id, m.body, m.sent_at, m.sender_id, m.is_read
          FROM messages m
          WHERE (m.sender_id = :userId AND m.recipient_id = other.other_user_id)
             OR (m.sender_id = other.other_user_id AND m.recipient_id = :userId)
          ORDER BY m.sent_at DESC
          FETCH FIRST 1 ROW ONLY
        ) latest
        ORDER BY latest.sent_at DESC
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return result.rows.map((row) => ({
      otherUserId: row.OTHER_USER_ID,
      otherUserName: row.OTHER_USER_NAME,
      lastMessageId: row.MESSAGE_ID,
      lastMessageBody: row.BODY,
      lastMessageSentAt: row.SENT_AT,
      lastMessageSenderId: row.LAST_SENDER_ID,
      lastMessageIsRead: row.LAST_IS_READ === 1,
      unreadCount: Number(row.UNREAD_COUNT ?? 0),
    }));
  } finally {
    if (connection) await connection.close();
  }
}

/** Distinct set of user IDs this user has ever exchanged a message with — used to decide who to push presence (online/offline) updates to. */
async function getConversationPartnerIds(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        SELECT DISTINCT
          CASE WHEN sender_id = :userId THEN recipient_id ELSE sender_id END AS other_user_id
        FROM messages
        WHERE sender_id = :userId OR recipient_id = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.map((r) => r.OTHER_USER_ID);
  } finally {
    if (connection) await connection.close();
  }
}

/** Marks every message from `otherUserId` to `userId` as read (opening a thread reads the whole thread, not one message at a time). Returns the count updated, so the caller can skip the read-receipt socket push when nothing changed. */
async function markThreadRead(userId, otherUserId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE messages SET is_read = 1
       WHERE recipient_id = :userId AND sender_id = :otherUserId AND is_read = 0`,
      { userId, otherUserId },
      { autoCommit: true },
    );
    return result.rowsAffected ?? 0;
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

module.exports = {
  sendMessage,
  findById,
  getThread,
  getInbox,
  getConversations,
  getConversationPartnerIds,
  markRead,
  markThreadRead,
  unreadCount,
  countAll,
};
