const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const userRoleModel = require('../models/userRoleModel');
const { generateToken } = require('../utils/jwt');

const PUBLIC_REGISTRATION_ROLES = ['producer', 'freelancer', 'client'];
const SALT_ROUNDS = 12;

function normalizeRegisterPayload(payload) {
  return {
    fullName: String(payload.fullName || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    password: String(payload.password || ''),
    phoneNumber: payload.phoneNumber ? String(payload.phoneNumber).trim() : null,
    role: String(payload.role || '').trim().toLowerCase(),
  };
}

function validateRegisterPayload(payload) {
  const errors = [];

  if (!payload.fullName || payload.fullName.length < 2) {
    errors.push('Full name must be at least 2 characters long.');
  }

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('A valid email address is required.');
  }

  if (!payload.password || payload.password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  if (!PUBLIC_REGISTRATION_ROLES.includes(payload.role)) {
    errors.push('Role must be producer, freelancer, or client.');
  }

  return errors;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    // Every existing consumer (route guards, frontend) reads `role` — by
    // sourcing it from activeRole here, switching a user's active role
    // takes effect everywhere immediately without touching those consumers.
    role: user.activeRole || user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

function createServiceError(statusCode, message, errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

async function register(payload) {
  const data = normalizeRegisterPayload(payload);
  const validationErrors = validateRegisterPayload(data);

  if (validationErrors.length > 0) {
    throw createServiceError(400, 'Registration data is invalid.', validationErrors);
  }

  const existingUser = await userModel.findByEmail(data.email);

  if (existingUser) {
    throw createServiceError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const user = await userModel.createUser({
    fullName: data.fullName,
    email: data.email,
    passwordHash,
    phoneNumber: data.phoneNumber,
    role: data.role,
  });
  await userRoleModel.addRole(user.id, data.role);
  const token = generateToken(user);

  return {
    user: sanitizeUser(user),
    token,
  };
}

async function login(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');

  if (!email || !password) {
    throw createServiceError(400, 'Email and password are required.');
  }

  const user = await userModel.findByEmail(email);

  if (!user || user.status !== 'active') {
    throw createServiceError(401, 'Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw createServiceError(401, 'Invalid email or password.');
  }

  return {
    user: sanitizeUser(user),
    token: generateToken(user),
  };
}

/** GET /api/auth/roles — every role this account holds, plus which is active. */
async function listRoles(userId) {
  const [roles, user] = await Promise.all([
    userRoleModel.findRolesByUser(userId),
    userModel.findById(userId),
  ]);

  if (!user) {
    throw createServiceError(404, 'User not found.');
  }

  // A pre-migration account might not have a user_roles row backfilled yet
  // in some edge case (e.g. migrate.js hasn't been run) — fall back to its
  // single role rather than returning an empty list.
  return {
    roles: roles.length > 0 ? roles : [user.activeRole || user.role],
    activeRole: user.activeRole || user.role,
  };
}

/**
 * Grants an additional role to the signed-in account (e.g. a freelancer who
 * also wants to post jobs as a producer). Does NOT switch to it — that's a
 * separate, explicit action (switchActiveRole). Same role vocabulary as
 * public registration; 'admin' can't be self-granted here either.
 */
async function addRole(userId, role) {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (!PUBLIC_REGISTRATION_ROLES.includes(normalizedRole)) {
    throw createServiceError(400, 'Role must be producer, freelancer, or client.');
  }

  await userRoleModel.addRole(userId, normalizedRole);
  return listRoles(userId);
}

/** PATCH /api/auth/active-role — switch which of the account's roles is active. */
async function switchActiveRole(userId, role) {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const owns = await userRoleModel.hasRole(userId, normalizedRole);

  if (!owns) {
    throw createServiceError(403, 'You do not have that role on this account.');
  }

  const user = await userModel.setActiveRole(userId, normalizedRole);
  return sanitizeUser(user);
}

module.exports = {
  login,
  register,
  sanitizeUser,
  listRoles,
  addRole,
  switchActiveRole,
};
