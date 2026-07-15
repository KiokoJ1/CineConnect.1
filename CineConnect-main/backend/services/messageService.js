const messageModel = require('../models/messageModel');
const userModel = require('../models/userModel');
const { emitToUser, isUserOnline } = require('./socketService');

const MAX_BODY_LENGTH = 2000;

function createServiceError(statusCode, message, errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

/**
 * Sends a message and persists it permanently in Oracle (the `messages`
 * table already has no delete/expiry path — this only adds to it). If this
 * is the first message ever exchanged between the two users, the
 * conversation "appears" implicitly: there's no separate conversations
 * table to insert into, `listConversations()` derives the Chats list
 * straight from `messages`, so the very next read already reflects it.
 */
async function sendMessage(user, payload) {
  const recipientId = Number(payload.recipientId);
  const body = String(payload.body || '').trim();
  const projectId = payload.projectId ? Number(payload.projectId) : null;

  if (!recipientId || Number.isNaN(recipientId)) {
    throw createServiceError(400, 'recipientId is required.');
  }

  if (!body) {
    throw createServiceError(400, 'Message body cannot be empty.');
  }

  if (body.length > MAX_BODY_LENGTH) {
    throw createServiceError(400, `Message body cannot exceed ${MAX_BODY_LENGTH} characters.`);
  }

  if (recipientId === user.id) {
    throw createServiceError(400, 'You cannot message yourself.');
  }

  const recipient = await userModel.findById(recipientId);

  if (!recipient) {
    throw createServiceError(404, 'Recipient not found.');
  }

  const message = await messageModel.sendMessage({
    senderId: user.id,
    recipientId,
    body,
    projectId,
  });

  // Real-time push: the recipient's open chat screen (if any) appends the
  // message live, and both sides' Chats lists refresh their preview/order
  // instantly via the lighter 'conversation:update' event — mirroring the
  // notification system's persist-then-push pattern, just without a
  // separate notifications-table row (the message row IS the durable
  // record here).
  emitToUser(recipientId, 'message:new', message);

  const conversationUpdate = {
    lastMessageBody: message.body,
    lastMessageAt: message.sentAt,
  };
  emitToUser(recipientId, 'conversation:update', { otherUserId: user.id, ...conversationUpdate });
  emitToUser(user.id, 'conversation:update', { otherUserId: recipientId, ...conversationUpdate });

  return message;
}

/** Chats list: one row per conversation, newest first, with a live/derived Delivered vs Seen signal for the current user's own last-sent message. */
async function listConversations(user) {
  const rows = await messageModel.listConversations(user.id);
  return rows.map((row) => ({
    ...row,
    otherUserOnline: isUserOnline(row.otherUserId),
  }));
}

/** Header metadata for one conversation — participant identity + live online status. */
async function getConversation(user, otherUserId) {
  const other = await userModel.findById(otherUserId);

  if (!other) {
    throw createServiceError(404, 'Conversation not found.');
  }

  return {
    otherUserId: other.id,
    otherUserName: other.fullName,
    otherUserRole: other.role,
    online: isUserOnline(other.id),
  };
}

/**
 * Full chronological thread with a specific other user, ordered oldest to
 * newest for top-to-bottom rendering. Opening the thread is also the
 * "seen" moment: every message the other person sent that's still unread
 * gets marked read in one bulk update, and — if anything actually changed
 * — the other user gets a live 'message:seen' receipt so a bubble they're
 * currently looking at can flip from Delivered to Seen without a refresh.
 */
async function getThread(user, otherUserId) {
  const other = await userModel.findById(otherUserId);

  if (!other) {
    throw createServiceError(404, 'Conversation not found.');
  }

  const changed = await messageModel.markThreadRead(user.id, otherUserId);

  if (changed > 0) {
    emitToUser(otherUserId, 'message:seen', { readerId: user.id });
  }

  return messageModel.getThread(user.id, otherUserId);
}

async function getUnreadCount(user) {
  return messageModel.unreadCount(user.id);
}

module.exports = {
  sendMessage,
  listConversations,
  getConversation,
  getThread,
  getUnreadCount,
};
