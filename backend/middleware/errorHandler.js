const { sendError } = require('../utils/apiResponse');
const env = require('../config/env');

function notFoundHandler(req, res) {
  return sendError(res, 404, `Route not found: ${req.originalUrl}`);
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const isDevelopment = env.nodeEnv === 'development';
  const message = statusCode === 500 && !isDevelopment ? 'Internal server error' : error.message;
  const errors = error.errors || (isDevelopment && statusCode === 500 ? { detail: error.message } : null);

  if (statusCode === 500) {
    console.error(error);
  }

  return sendError(res, statusCode, message, errors);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
