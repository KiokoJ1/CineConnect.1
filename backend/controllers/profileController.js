const profileService = require('../services/profileService');
const { sendSuccess } = require('../utils/apiResponse');

async function getMyProfile(req, res, next) {
  try {
    // Returns null for new users — frontend handles "no profile yet" state
    const profile = await profileService.getMyProfile(req.user.id);
    return sendSuccess(res, 200, 'Profile retrieved successfully.', { profile });
  } catch (error) { return next(error); }
}

async function upsertMyProfile(req, res, next) {
  try {
    const profile = await profileService.upsertMyProfile(req.user.id, req.body);
    return sendSuccess(res, 200, 'Profile saved successfully.', { profile });
  } catch (error) { return next(error); }
}

async function getProfileByUserId(req, res, next) {
  try {
    const profile = await profileService.getProfileByUserId(Number(req.params.userId));
    return sendSuccess(res, 200, 'Profile retrieved successfully.', { profile });
  } catch (error) { return next(error); }
}

async function listFreelancers(req, res, next) {
  try {
    const freelancers = await profileService.listFreelancers();
    return sendSuccess(res, 200, 'Freelancer profiles retrieved successfully.', { freelancers });
  } catch (error) { return next(error); }
}

async function getProfileStats(req, res, next) {
  try {
    const stats = await profileService.getProfileStats(Number(req.params.userId));
    return sendSuccess(res, 200, 'Profile stats retrieved successfully.', stats);
  } catch (error) { return next(error); }
}

module.exports = { getMyProfile, getProfileByUserId, listFreelancers, upsertMyProfile, getProfileStats };
