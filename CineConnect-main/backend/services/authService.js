const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
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

const VALID_ROLES = ['producer', 'freelancer', 'client', 'admin'];

/**
 * `role` on the sanitized user is the *active* role — every existing
 * permission check in this codebase (`requireRole()`, `user.role !== 'admin'`,
 * etc.) reads `req.user.role`, so keeping that field pointed at the active
 * role means switching roles takes effect everywhere automatically, with no
 * other file needing to change. `roles` is the full switchable list.
 */
async function sanitizeUser(user) {
  const roles = await userModel.getRoles(user.id);
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.activeRole || user.role,
    roles: roles.length ? roles : [user.role],
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
  const token = generateToken(user);

  return {
    user: await sanitizeUser(user),
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
    user: await sanitizeUser(user),
    token: generateToken(user),
  };
}

/**
 * Switches the caller's active role to one they already hold (granting a
 * *new* role isn't part of this flow — it's provisioned into USER_ROLES
 * separately). Re-checks the role list fresh from Oracle rather than
 * trusting `user.roles` off the request, since that was read at the start
 * of the request and could theoretically be stale.
 */
async function switchActiveRole(user, role) {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (!VALID_ROLES.includes(normalizedRole)) {
    throw createServiceError(400, 'Role must be producer, freelancer, client, or admin.');
  }

  const grantedRoles = await userModel.getRoles(user.id);
  if (!grantedRoles.includes(normalizedRole)) {
    throw createServiceError(403, `Your account doesn't have the ${normalizedRole} role.`);
  }

  const updated = await userModel.setActiveRole(user.id, normalizedRole);
  return { user: await sanitizeUser(updated) };
}

/**
 * Self-service: lets a signed-in user add one of the public roles to their
 * own account (e.g. a freelancer who also wants to post jobs as a
 * producer/client), then immediately switches to it. Deliberately excludes
 * 'admin' — that's still only ever granted directly in Oracle, same as
 * before this feature existed.
 */
async function addRole(user, role) {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (!PUBLIC_REGISTRATION_ROLES.includes(normalizedRole)) {
    throw createServiceError(400, 'Role must be producer, freelancer, or client.');
  }

  await userModel.addRole(user.id, normalizedRole);
  const updated = await userModel.setActiveRole(user.id, normalizedRole);
  return { user: await sanitizeUser(updated) };
}

module.exports = {
  login,
  register,
  sanitizeUser,
  switchActiveRole,
  addRole,
};
