const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const userModel = require('../models/userModel');
const { sanitizeUser } = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.use(authenticate);

// GET /api/users?search=&role=&skills=&location=&page=&limit= — user directory for starting a
// new conversation, Browse Talent, and general search. Unlike /api/admin/users this is open to
// any signed-in user, not just admins, and never returns the caller themselves or admin accounts.
router.get('/', async (req, res, next) => {
  try {
    const { role, search, skills, location, page, limit } = req.query;
    const result = await userModel.findAll({
      role: role || undefined,
      search: search || undefined,
      skills: skills || undefined,
      location: location || undefined,
      page,
      limit,
    });
    const visible = result.users.filter((u) => u.id !== req.user.id && u.role !== 'admin');
    return sendSuccess(res, 200, 'Users retrieved.', {
      users: visible.map(sanitizeUser),
      pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/users/:id — a single user's public info (chat header, message button target).
router.get('/:id', async (req, res, next) => {
  try {
    const user = await userModel.findById(Number(req.params.id));
    if (!user) return sendError(res, 404, 'User not found.');
    return sendSuccess(res, 200, 'User retrieved.', { user: sanitizeUser(user) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
