const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const followModel = require('../models/followModel');
const userModel = require('../models/userModel');
const { notify } = require('../services/notificationService');
const { emitToUser } = require('../services/socketService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.use(authenticate);

async function counts(userId) {
  const [followerCount, followingCount] = await Promise.all([
    followModel.countFollowers(userId),
    followModel.countFollowing(userId),
  ]);
  return { followerCount, followingCount };
}

// GET /api/follows/:userId — follow status + counts for a profile screen.
router.get('/:userId', async (req, res, next) => {
  try {
    const targetId = Number(req.params.userId);
    const [following, followCounts] = await Promise.all([
      req.user.id === targetId ? Promise.resolve(false) : followModel.isFollowing(req.user.id, targetId),
      counts(targetId),
    ]);
    return sendSuccess(res, 200, 'Follow status retrieved.', { isFollowing: following, ...followCounts });
  } catch (err) {
    return next(err);
  }
});

// POST /api/follows/:userId — follow.
router.post('/:userId', async (req, res, next) => {
  try {
    const targetId = Number(req.params.userId);
    if (targetId === req.user.id) {
      return sendError(res, 400, "You can't follow yourself.");
    }
    const target = await userModel.findById(targetId);
    if (!target) return sendError(res, 404, 'User not found.');

    await followModel.follow(req.user.id, targetId);
    const followCounts = await counts(targetId);

    // Real-time: push the new count to the followee if they're online, and
    // leave a durable notification either way (same notify() used by the
    // application-workflow and messaging features).
    emitToUser(targetId, 'follow_update', { userId: targetId, ...followCounts });
    notify({
      userId: targetId,
      type: 'new_follower',
      title: 'New Follower',
      body: `${req.user.fullName} started following you.`,
      data: { followerId: req.user.id },
    }).catch((err) => console.error('Failed to send follow notification:', err.message));

    return sendSuccess(res, 200, 'Followed.', { isFollowing: true, ...followCounts });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/follows/:userId — unfollow.
router.delete('/:userId', async (req, res, next) => {
  try {
    const targetId = Number(req.params.userId);
    await followModel.unfollow(req.user.id, targetId);
    const followCounts = await counts(targetId);

    emitToUser(targetId, 'follow_update', { userId: targetId, ...followCounts });

    return sendSuccess(res, 200, 'Unfollowed.', { isFollowing: false, ...followCounts });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
