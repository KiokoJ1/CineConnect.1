const applicationService = require('../services/applicationService');
const { sendSuccess } = require('../utils/apiResponse');

async function applyToProject(req, res, next) {
  try {
    const application = await applicationService.applyToProject(
      req.user,
      Number(req.params.projectId),
      req.body,
    );
    return sendSuccess(res, 201, 'Application submitted successfully.', { application });
  } catch (error) {
    return next(error);
  }
}

async function listMyApplications(req, res, next) {
  try {
    const applications = await applicationService.listMyApplications(req.user);
    return sendSuccess(res, 200, 'Your applications retrieved successfully.', { applications });
  } catch (error) {
    return next(error);
  }
}

async function listProjectApplications(req, res, next) {
  try {
    const applications = await applicationService.listProjectApplications(
      req.user,
      Number(req.params.projectId),
    );
    return sendSuccess(res, 200, 'Project applications retrieved successfully.', { applications });
  } catch (error) {
    return next(error);
  }
}

async function updateApplicationStatus(req, res, next) {
  try {
    const application = await applicationService.updateApplicationStatus(
      req.user,
      Number(req.params.applicationId),
      req.body.status,
      req.body.force === true,
    );
    return sendSuccess(res, 200, 'Application status updated successfully.', { application });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  applyToProject,
  listMyApplications,
  listProjectApplications,
  updateApplicationStatus,
};
