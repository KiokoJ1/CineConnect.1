const userModel = require('../models/userModel');
const authService = require('../services/authService');
const { verifyToken } = require('../utils/jwt');

function getBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
}

async function authenticate(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      const error = new Error('Authentication token is required.');
      error.statusCode = 401;
      throw error;
    }

    const payload = verifyToken(token);
    const user = await userModel.findById(payload.userId);

    if (!user || user.status !== 'active') {
      const error = new Error('Authenticated user was not found.');
      error.statusCode = 401;
      throw error;
    }

    req.user = await authService.sanitizeUser(user);
    return next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
      error.message = 'Invalid or expired authentication token.';
    }

    return next(error);
  }
}

/**
 * Route guard for role-restricted endpoints (e.g. the Admin panel). Must run
 * after `authenticate`, which populates `req.user`.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error('You do not have permission to access this resource.');
      error.statusCode = 403;
      return next(error);
    }
    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};
