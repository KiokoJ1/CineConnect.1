const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const messageModel = require('../models/messageModel');
const { emitToUser } = require('../services/socketService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

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
    // See socketService.js's message handler for why this only targets the
    // recipient, not the sender.
    emitToUser(message.recipientId, 'message', message);
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

// PATCH /api/messages/thread/:userId/read — mark every message in a thread read at once (used when a chat screen opens).
router.patch('/thread/:userId/read', authenticate, async (req, res, next) => {
  try {
    const otherUserId = Number(req.params.userId);
    await messageModel.markThreadRead(req.user.id, otherUserId);
    // otherUserId's sent messages just got marked read — tell them live so
    // their Delivered indicator flips to Seen without a refetch.
    emitToUser(otherUserId, 'read', { byUserId: req.user.id });
    return sendSuccess(res, 200, 'Thread marked as read.');
  } catch (err) { return next(err); }
});

module.exports = router;
