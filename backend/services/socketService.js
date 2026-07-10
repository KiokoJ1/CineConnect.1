const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');

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
