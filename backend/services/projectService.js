const projectModel = require('../models/projectModel');
const applicationModel = require('../models/applicationModel');
const ratingModel = require('../models/ratingModel');

const OWNER_ROLES = ['producer', 'client'];
const VALID_STATUSES = ['open', 'closed', 'cancelled'];

function createServiceError(statusCode, message, errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

function normalizeProjectPayload(payload) {
  return {
    title: String(payload.title || '').trim(),
    description: String(payload.description || '').trim(),
    roleNeeded: String(payload.roleNeeded || '').trim(),
    location: String(payload.location || '').trim(),
    budget: payload.budget === undefined || payload.budget === null ? null : Number(payload.budget),
    startDate: String(payload.startDate || '').trim(),
    endDate: String(payload.endDate || '').trim(),
    status: payload.status ? String(payload.status).trim().toLowerCase() : 'open',
  };
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateProjectPayload(payload) {
  const errors = [];

  if (!payload.title || payload.title.length < 3 || payload.title.length > 150) {
    errors.push('Title must be between 3 and 150 characters.');
  }

  if (!payload.description || payload.description.length < 10 || payload.description.length > 2000) {
    errors.push('Description must be between 10 and 2000 characters.');
  }

  if (!payload.roleNeeded || payload.roleNeeded.length > 100) {
    errors.push('Role needed is required and cannot exceed 100 characters.');
  }

  if (!payload.location || payload.location.length > 100) {
    errors.push('Location is required and cannot exceed 100 characters.');
  }

  if (payload.budget !== null && (!Number.isFinite(payload.budget) || payload.budget < 0)) {
    errors.push('Budget must be a positive number.');
  }

  if (!isDateString(payload.startDate)) {
    errors.push('Start date must use YYYY-MM-DD format.');
  }

  if (!isDateString(payload.endDate)) {
    errors.push('End date must use YYYY-MM-DD format.');
  }

  if (isDateString(payload.startDate) && isDateString(payload.endDate) && payload.endDate < payload.startDate) {
    errors.push('End date cannot be before start date.');
  }

  if (!VALID_STATUSES.includes(payload.status)) {
    errors.push('Status must be open, closed, or cancelled.');
  }

  return errors;
}

function ensureProjectOwnerRole(user) {
  if (!OWNER_ROLES.includes(user.role)) {
    throw createServiceError(403, 'Only producers and clients can manage projects.');
  }
}

async function createProject(user, payload) {
  ensureProjectOwnerRole(user);

  const data = normalizeProjectPayload(payload);
  const validationErrors = validateProjectPayload(data);

  if (validationErrors.length > 0) {
    throw createServiceError(400, 'Project data is invalid.', validationErrors);
  }

  return projectModel.createProject(user.id, data);
}

async function listOpenProjects(filters) {
  return projectModel.findAllOpen(filters);
}

async function listMyProjects(user) {
  ensureProjectOwnerRole(user);
  const projects = await projectModel.findByOwner(user.id);
  return Promise.all(
    projects.map(async (project) => {
      const counts = await applicationModel.countByProject(project.projectId);
      return { ...project, applicationCount: counts.total, shortlistedCount: counts.shortlisted };
    }),
  );
}

async function getProject(projectId) {
  const project = await projectModel.findById(projectId);

  if (!project) {
    throw createServiceError(404, 'Project not found.');
  }

  const [counts, ownerJobsPosted, ownerRating] = await Promise.all([
    applicationModel.countByProject(project.projectId),
    projectModel.countByOwner(project.ownerId),
    ratingModel.getAverageScore(project.ownerId),
  ]);

  return {
    ...project,
    applicationCount: counts.total,
    shortlistedCount: counts.shortlisted,
    ownerJobsPosted,
    ownerRating: ownerRating.avgScore ?? 0,
  };
}

async function updateProject(user, projectId, payload) {
  ensureProjectOwnerRole(user);

  const existingProject = await getProject(projectId);

  if (existingProject.ownerId !== user.id) {
    throw createServiceError(403, 'You can only update your own projects.');
  }

  const data = normalizeProjectPayload(payload);
  const validationErrors = validateProjectPayload(data);

  if (validationErrors.length > 0) {
    throw createServiceError(400, 'Project data is invalid.', validationErrors);
  }

  return projectModel.updateProject(projectId, data);
}

module.exports = {
  createProject,
  getProject,
  listMyProjects,
  listOpenProjects,
  updateProject,
};
