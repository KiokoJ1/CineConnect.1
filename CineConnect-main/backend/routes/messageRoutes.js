const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const messageModel = require('../models/messageModel');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { emitToUser } = require('../services/socketService');

const router = express.Router();

// GET /api/messages/conversations
// One row per DM thread (the other participant + latest message + unread
// count) — powers the Chats list. Ordered by most recent activity.
router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const conversations = await messageModel.getConversations(req.user.id);
    return sendSuccess(res, 200, 'Conversations retrieved.', { conversations });
  } catch (err) { return next(err); }
});

// GET /api/messages/inbox
router.get('/inbox', authenticate, async (req, res, next) => {
  try {
    const messages = await messageModel.getInbox(req.user.id);
    return sendSuccess(res, 200, 'Inbox retrieved.', { messages });
  } catch (err) { return next(err); }
});

// GET /api/messages/unread-count
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await messageModel.unreadCount(req.user.id);
    return sendSuccess(res, 200, 'Unread count.', { count });
  } catch (err) { return next(err); }
});

// GET /api/messages/thread/:userId
router.get('/thread/:userId', authenticate, async (req, res, next) => {
  try {
    const messages = await messageModel.getThread(req.user.id, Number(req.params.userId));
    return sendSuccess(res, 200, 'Thread retrieved.', { messages });
  } catch (err) { return next(err); }
});

// PATCH /api/messages/thread/:userId/read
// Marks the whole thread with :userId as read (opening a chat reads
// everything in it, not one bubble at a time) and pushes a live
// "seen" receipt back to the other participant if they're connected.
router.patch('/thread/:userId/read', authenticate, async (req, res, next) => {
  try {
    const otherUserId = Number(req.params.userId);
    const updatedCount = await messageModel.markThreadRead(req.user.id, otherUserId);
    if (updatedCount > 0) {
      emitToUser(otherUserId, 'message:seen', { seenBy: req.user.id, at: new Date().toISOString() });
    }
    return sendSuccess(res, 200, 'Thread marked as read.', { updatedCount });
  } catch (err) { return next(err); }
});

// POST /api/messages
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { recipientId, body, projectId } = req.body;
    if (!recipientId || !body?.trim()) {
      return sendError(res, 400, 'recipientId and body are required.');
    }
    if (Number(recipientId) === req.user.id) {
      return sendError(res, 400, 'You cannot message yourself.');
    }
    const message = await messageModel.sendMessage({
      senderId:    req.user.id,
      recipientId: Number(recipientId),
      body:        body.trim(),
      projectId:   projectId ? Number(projectId) : null,
    });

    // Real-time delivery: push straight to the recipient's open socket(s) if
    // connected. The message is already durably committed in Oracle above
    // regardless, so a disconnected recipient just sees it on their next
    // GET /api/messages/conversations or /thread/:userId fetch instead.
    emitToUser(Number(recipientId), 'message:new', { message });
    // Also echo to the sender's other connected devices/tabs so every
    // session's conversation list stays in sync immediately.
    emitToUser(req.user.id, 'message:new', { message });

    return sendSuccess(res, 201, 'Message sent.', { message });
  } catch (err) { return next(err); }
});

// PATCH /api/messages/:messageId/read
router.patch('/:messageId/read', authenticate, async (req, res, next) => {
  try {
    await messageModel.markRead(Number(req.params.messageId), req.user.id);
    return sendSuccess(res, 200, 'Marked as read.');
  } catch (err) { return next(err); }
});

module.exports = router;
