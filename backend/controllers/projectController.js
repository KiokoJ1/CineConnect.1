const projectService = require('../services/projectService');
const { sendSuccess } = require('../utils/apiResponse');

async function createProject(req, res, next) {
  try {
    const project = await projectService.createProject(req.user, req.body);
    return sendSuccess(res, 201, 'Project created successfully.', { project });
  } catch (error) {
    return next(error);
  }
}

async function listOpenProjects(req, res, next) {
  try {
    const { search, role, location, minBudget, maxBudget, page, limit } = req.query;
    const result = await projectService.listOpenProjects({
      search: search || undefined,
      role: role || undefined,
      location: location || undefined,
      minBudget: minBudget || undefined,
      maxBudget: maxBudget || undefined,
      page,
      limit,
    });
    return sendSuccess(res, 200, 'Open projects retrieved successfully.', {
      projects: result.projects,
      pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (error) {
    return next(error);
  }
}

async function listMyProjects(req, res, next) {
  try {
    const projects = await projectService.listMyProjects(req.user);
    return sendSuccess(res, 200, 'Your projects retrieved successfully.', { projects });
  } catch (error) {
    return next(error);
  }
}

async function getProject(req, res, next) {
  try {
    const project = await projectService.getProject(Number(req.params.projectId));
    return sendSuccess(res, 200, 'Project retrieved successfully.', { project });
  } catch (error) {
    return next(error);
  }
}

async function updateProject(req, res, next) {
  try {
    const project = await projectService.updateProject(req.user, Number(req.params.projectId), req.body);
    return sendSuccess(res, 200, 'Project updated successfully.', { project });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createProject,
  getProject,
  listMyProjects,
  listOpenProjects,
  updateProject,
};
