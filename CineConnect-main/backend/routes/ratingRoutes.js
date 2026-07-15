const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const ratingModel = require('../models/ratingModel');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

// POST /api/ratings — submit a rating
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { projectId, revieweeId, score, reviewText } = req.body;
    if (!projectId || !revieweeId || score === undefined) {
      return sendError(res, 400, 'projectId, revieweeId and score are required.');
    }
    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 1 || numScore > 5) {
      return sendError(res, 400, 'Score must be between 1 and 5.');
    }
    if (Number(revieweeId) === req.user.id) {
      return sendError(res, 400, 'You cannot rate yourself.');
    }
    const rating = await ratingModel.createRating({
      projectId:  Number(projectId),
      reviewerId: req.user.id,
      revieweeId: Number(revieweeId),
      score:      numScore,
      reviewText: reviewText || null,
    });
    return sendSuccess(res, 201, 'Rating submitted.', { rating });
  } catch (err) {
    // ORA-00001 = unique constraint — already rated
    if (err.errorNum === 1 || err.message?.includes('unique constraint')) {
      return sendError(res, 409, 'You have already rated this person for this project.');
    }
    return next(err);
  }
});

// GET /api/ratings/user/:userId — ratings received by a user + average
router.get('/user/:userId', authenticate, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const [ratings, stats] = await Promise.all([
      ratingModel.findByReviewee(userId),
      ratingModel.getAverageScore(userId),
    ]);
    return sendSuccess(res, 200, 'Ratings retrieved.', { ratings, stats });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
