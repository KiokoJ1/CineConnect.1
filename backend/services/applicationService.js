const applicationModel = require('../models/applicationModel');
const projectModel = require('../models/projectModel');
const { notify } = require('./notificationService');

const VALID_STATUSES = ['applied', 'shortlisted', 'declined', 'hired'];

function createServiceError(statusCode, message, errors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

function ensureFreelancer(user) {
  if (user.role !== 'freelancer') {
    throw createServiceError(403, 'Only freelancers can apply to projects.');
  }
}

async function applyToProject(user, projectId, payload) {
  ensureFreelancer(user);

  const pitchText = payload.pitchText ? String(payload.pitchText).trim() : null;

  if (pitchText && pitchText.length > 2000) {
    throw createServiceError(400, 'Pitch text cannot exceed 2000 characters.');
  }

  const project = await projectModel.findById(projectId);

  if (!project) {
    throw createServiceError(404, 'Project not found.');
  }

  if (project.status !== 'open') {
    throw createServiceError(400, 'You can only apply to open projects.');
  }

  if (project.ownerId === user.id) {
    throw createServiceError(400, 'You cannot apply to your own project.');
  }

  const existingApplication = await applicationModel.findByProjectAndFreelancer(projectId, user.id);

  if (existingApplication) {
    throw createServiceError(409, 'You have already applied to this project.');
  }

  const application = await applicationModel.createApplication(projectId, user.id, pitchText);

  // Both notifications are fire-and-forget from the caller's perspective —
  // a notification failure must never fail the application itself, since
  // the application record is the source of truth and already committed.
  Promise.all([
    notify({
      userId: project.ownerId,
      type: 'new_application',
      title: 'New Application',
      body: `${user.fullName} applied to "${project.title}".`,
      data: { projectId, applicationId: application.applicationId },
    }),
    notify({
      userId: user.id,
      type: 'application_sent',
      title: 'Application Submitted',
      body: `Your application to "${project.title}" was submitted successfully.`,
      data: { projectId, applicationId: application.applicationId },
    }),
  ]).catch((err) => console.error('Failed to send application notifications:', err.message));

  return application;
}

async function listMyApplications(user) {
  ensureFreelancer(user);
  return applicationModel.findByFreelancer(user.id);
}

async function listProjectApplications(user, projectId) {
  const project = await projectModel.findById(projectId);

  if (!project) {
    throw createServiceError(404, 'Project not found.');
  }

  if (project.ownerId !== user.id && user.role !== 'admin') {
    throw createServiceError(403, 'You can only view applications for your own projects.');
  }

  return applicationModel.findByProject(projectId);
}

async function updateApplicationStatus(user, applicationId, status) {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (!VALID_STATUSES.includes(normalizedStatus)) {
    throw createServiceError(400, 'Status must be applied, shortlisted, declined, or hired.');
  }

  const application = await applicationModel.findById(applicationId);

  if (!application) {
    throw createServiceError(404, 'Application not found.');
  }

  if (application.projectOwnerId !== user.id && user.role !== 'admin') {
    throw createServiceError(403, 'You can only update applications for your own projects.');
  }

  const updated = await applicationModel.updateStatus(applicationId, normalizedStatus);

  if (normalizedStatus === 'shortlisted' || normalizedStatus === 'declined') {
    const accepted = normalizedStatus === 'shortlisted';
    notify({
      userId: application.freelancerId,
      type: accepted ? 'application_accepted' : 'application_declined',
      title: accepted ? 'Application Accepted' : 'Application Update',
      body: accepted
        ? `Your application to "${application.projectTitle}" was accepted!`
        : `Your application to "${application.projectTitle}" was not selected this time.`,
      data: { projectId: application.projectId, applicationId },
    }).catch((err) => console.error('Failed to send status notification:', err.message));
  }

  return updated;
}

module.exports = {
  applyToProject,
  listMyApplications,
  listProjectApplications,
  updateApplicationStatus,
};
