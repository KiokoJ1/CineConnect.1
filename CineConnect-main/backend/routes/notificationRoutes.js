const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const notificationModel = require('../models/notificationModel');
const { sendSuccess } = require('../utils/apiResponse');

const router = express.Router();

router.use(authenticate);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const notifications = await notificationModel.findByUser(req.user.id);
    return sendSuccess(res, 200, 'Notifications retrieved.', { notifications });
  } catch (err) {
    return next(err);
  }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res, next) => {
  try {
    await notificationModel.markAllRead(req.user.id);
    return sendSuccess(res, 200, 'Notifications marked as read.');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
