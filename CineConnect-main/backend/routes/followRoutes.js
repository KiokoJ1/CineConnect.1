const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const followModel = require('../models/followModel');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { emitToUser } = require('../services/socketService');

const router = express.Router();

async function statusPayload(viewerId, targetId) {
  const [isFollowing, counts] = await Promise.all([
    followModel.isFollowing(viewerId, targetId),
    followModel.getCounts(targetId),
  ]);
  return { isFollowing, followerCount: counts.followers, followingCount: counts.following };
}

// GET /api/follows/:userId — am I following them + their follower/following counts
router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const targetId = Number(req.params.userId);
    return sendSuccess(res, 200, 'Follow status retrieved.', await statusPayload(req.user.id, targetId));
  } catch (err) { return next(err); }
});

// POST /api/follows/:userId — follow
router.post('/:userId', authenticate, async (req, res, next) => {
  try {
    const targetId = Number(req.params.userId);
    if (targetId === req.user.id) return sendError(res, 400, 'You cannot follow yourself.');

    await followModel.follow(req.user.id, targetId);
    const payload = await statusPayload(req.user.id, targetId);

    // Real-time: if the person being followed has their own profile/dashboard
    // open, their follower count updates live without a refresh.
    emitToUser(targetId, 'follow:changed', {
      followedId: targetId,
      followerCount: payload.followerCount,
      followingCount: payload.followingCount,
    });

    return sendSuccess(res, 200, 'Followed.', payload);
  } catch (err) { return next(err); }
});

// DELETE /api/follows/:userId — unfollow
router.delete('/:userId', authenticate, async (req, res, next) => {
  try {
    const targetId = Number(req.params.userId);
    await followModel.unfollow(req.user.id, targetId);
    const payload = await statusPayload(req.user.id, targetId);

    emitToUser(targetId, 'follow:changed', {
      followedId: targetId,
      followerCount: payload.followerCount,
      followingCount: payload.followingCount,
    });

    return sendSuccess(res, 200, 'Unfollowed.', payload);
  } catch (err) { return next(err); }
});

module.exports = router;
