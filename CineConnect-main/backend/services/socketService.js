const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const messageModel = require('../models/messageModel');

let io = null;

/** Room name for a given user — every route handler pushes here. */
function userRoom(userId) {
  return `user:${userId}`;
}

// Tracks how many live sockets each user currently has open (a user can have
// more than one — multiple tabs/devices) so presence only flips to
// "offline" once every connection for that user has dropped.
const onlineCounts = new Map();

function isUserOnline(userId) {
  return (onlineCounts.get(userId) ?? 0) > 0;
}

async function broadcastPresence(userId, online) {
  try {
    const partnerIds = await messageModel.getConversationPartnerIds(userId);
    partnerIds.forEach((partnerId) => emitToUser(partnerId, 'presence:changed', { userId, online }));
  } catch (err) {
    console.error('Failed to broadcast presence:', err.message);
  }
}

/**
 * Attaches Socket.IO to the existing HTTP server. Mirrors the auth pattern
 * the frontend already implements in src/services/socket.ts (token sent via
 * the `auth` handshake payload) — nothing on the client needed to change.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token is required.'));
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      return next();
    } catch (err) {
      return next(new Error('Invalid or expired authentication token.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(userRoom(userId));

    const wasOffline = !isUserOnline(userId);
    onlineCounts.set(userId, (onlineCounts.get(userId) ?? 0) + 1);
    if (wasOffline) broadcastPresence(userId, true);

    // One-off presence lookup for a single chat header ("Online"/"Offline").
    socket.on('presence:check', (payload, callback) => {
      if (typeof callback !== 'function') return;
      callback({ userId: payload?.userId, online: isUserOnline(Number(payload?.userId)) });
    });

    // Relays a typing state to the other participant of a DM. Purely
    // ephemeral — never persisted, matching how Instagram-style typing
    // indicators work.
    socket.on('typing', (payload) => {
      const toUserId = Number(payload?.toUserId);
      if (!toUserId) return;
      emitToUser(toUserId, 'typing', { fromUserId: userId, typing: !!payload?.typing });
    });

    socket.on('disconnect', () => {
      const remaining = Math.max((onlineCounts.get(userId) ?? 1) - 1, 0);
      if (remaining === 0) {
        onlineCounts.delete(userId);
        broadcastPresence(userId, false);
      } else {
        onlineCounts.set(userId, remaining);
      }
    });
  });

  return io;
}

/** Push a real-time event to every connection for one user. No-op if a socket
 * isn't connected (or the server is running without sockets, e.g. in tests) —
 * the notification is still persisted to Oracle by the caller regardless, so
 * nothing is lost, it just won't show up live until the next fetch. */
function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(userRoom(userId)).emit(event, payload);
}

module.exports = { initSocket, emitToUser, isUserOnline };
