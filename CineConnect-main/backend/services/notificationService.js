const notificationModel = require('../models/notificationModel');
const { emitToUser } = require('./socketService');

/**
 * Persists a notification and pushes it live if the user has a socket
 * connection. Always persists first — real-time delivery is a bonus on top
 * of the durable record, never a substitute for it (so it's still there
 * after a refresh / if the user was offline when it happened).
 */
async function notify({ userId, type, title, body, data }) {
  const notification = await notificationModel.create({ userId, type, title, body, data });
  emitToUser(userId, 'notification', notification);
  return notification;
}

module.exports = { notify };
