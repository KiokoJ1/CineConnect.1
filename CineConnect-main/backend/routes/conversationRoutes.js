const express = require('express');
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/conversations — the Chats list: one row per person the signed-in user has messaged, newest first.
router.get('/', authenticate, messageController.listConversations);

// GET /api/conversations/:otherUserId — header metadata (name, role, online status) for one chat screen.
router.get('/:otherUserId', authenticate, messageController.getConversation);

module.exports = router;
