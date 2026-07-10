const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const userModel = require('../models/userModel');
const projectModel = require('../models/projectModel');
const messageModel = require('../models/messageModel');
const applicationModel = require('../models/applicationModel');
const { sanitizeUser } = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

// Every route below is admin-only.
router.use(authenticate, requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, roleCounts, activeJobs, applications, messages] = await Promise.all([
      userModel.countAll(),
      userModel.countsByRole(),
      projectModel.countByStatus('open'),
      applicationModel.countAll(),
      messageModel.countAll(),
    ]);

    // No content-moderation/report table exists in the Oracle schema yet, so
    // there is no real number to show here — 0 rather than a fabricated
    // figure. See ADMIN_BACKEND_INTEGRATION.md.
    return sendSuccess(res, 200, 'Admin stats retrieved.', {
      totalUsers,
      producers: roleCounts.producer ?? 0,
      freelancers: roleCounts.freelancer ?? 0,
      clients: roleCounts.client ?? 0,
      activeJobs,
      applications,
      messages,
      flagged: 0,
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/users?role=&search=
router.get('/users', async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const users = await userModel.findAll({ role: role || undefined, search: search || undefined });
    return sendSuccess(res, 200, 'Users retrieved.', { users: users.map(sanitizeUser) });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/users/:id/suspend
router.patch('/users/:id/suspend', async (req, res, next) => {
  try {
    const target = await userModel.findById(Number(req.params.id));
    if (!target) return sendError(res, 404, 'User not found.');
    const updated = await userModel.updateStatus(target.id, 'suspended');
    return sendSuccess(res, 200, 'User suspended.', { user: sanitizeUser(updated) });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/users/:id/restore
router.patch('/users/:id/restore', async (req, res, next) => {
  try {
    const target = await userModel.findById(Number(req.params.id));
    if (!target) return sendError(res, 404, 'User not found.');
    const updated = await userModel.updateStatus(target.id, 'active');
    return sendSuccess(res, 200, 'User restored.', { user: sanitizeUser(updated) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
