const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const messageModel = require('../models/messageModel');

let io = null;

/** Room name for a given user — every route handler pushes here. */
function userRoom(userId) {
  return `user:${userId}`;
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
    socket.join(userRoom(socket.data.userId));

    // Real-time chat: the message is always persisted to Oracle first (the
    // durable record), then broadcast to both parties — so a chat works
    // identically whether or not the other side happens to be connected
    // right now, and refreshing the thread always matches what was shown live.
    socket.on('message', async ({ recipientId, body, projectId }, ack) => {
      try {
        if (!recipientId || !body?.trim()) return;
        const message = await messageModel.sendMessage({
          senderId: socket.data.userId,
          recipientId: Number(recipientId),
          body: body.trim(),
          projectId: projectId ? Number(projectId) : null,
        });
        // Only push to the recipient — the sender already has an optimistic
        // bubble on screen and reconciles it via the ack below. Echoing the
        // same message back to the sender's own socket raced against that
        // reconciliation and could leave two list rows with the same id
        // (the "duplicate key" warning/crash in the chat screen).
        emitToUser(message.recipientId, 'message', message);
        if (typeof ack === 'function') ack({ ok: true, message });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    // Typing indicator — ephemeral, not persisted.
    socket.on('typing', ({ recipientId, typing }) => {
      if (!recipientId) return;
      emitToUser(Number(recipientId), 'typing', { fromUserId: socket.data.userId, typing: !!typing });
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

module.exports = { initSocket, emitToUser };
