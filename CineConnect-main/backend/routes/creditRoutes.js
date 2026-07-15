const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const filmCreditModel = require('../models/filmCreditModel');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

// GET /api/credits/mine — film credits for the signed-in user.
// (Powers the freelancer dashboard's "profile completeness" indicator.)
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const credits = await filmCreditModel.findByUserId(req.user.id);
    return sendSuccess(res, 200, 'Film credits retrieved.', { credits });
  } catch (err) {
    return next(err);
  }
});

// POST /api/credits — add a film credit for the signed-in user.
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, role, year, creditType, description } = req.body;
    if (!title || !role) {
      return sendError(res, 400, 'title and role are required.');
    }
    const credit = await filmCreditModel.createCredit(req.user.id, {
      title,
      role,
      year: year ? Number(year) : null,
      creditType: creditType || null,
      description: description || null,
    });
    return sendSuccess(res, 201, 'Film credit added.', { credit });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/credits/:creditId — remove one of the signed-in user's credits.
router.delete('/:creditId', authenticate, async (req, res, next) => {
  try {
    const deleted = await filmCreditModel.deleteCredit(Number(req.params.creditId), req.user.id);
    if (!deleted) return sendError(res, 404, 'Credit not found.');
    return sendSuccess(res, 200, 'Film credit removed.');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
