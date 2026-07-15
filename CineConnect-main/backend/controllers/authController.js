const authService = require('../services/authService');
const { sendSuccess } = require('../utils/apiResponse');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return sendSuccess(res, 201, 'Account created successfully.', result);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return sendSuccess(res, 200, 'Login successful.', result);
  } catch (error) {
    return next(error);
  }
}

async function getCurrentUser(req, res) {
  return sendSuccess(res, 200, 'Authenticated user retrieved successfully.', {
    user: req.user,
  });
}

async function switchActiveRole(req, res, next) {
  try {
    const result = await authService.switchActiveRole(req.user, req.body.role);
    return sendSuccess(res, 200, 'Active role updated.', result);
  } catch (error) {
    return next(error);
  }
}

async function addRole(req, res, next) {
  try {
    const result = await authService.addRole(req.user, req.body.role);
    return sendSuccess(res, 201, 'Role added.', result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCurrentUser,
  login,
  register,
  switchActiveRole,
  addRole,
};
