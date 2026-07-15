const profileModel = require('../models/profileModel');

const VALID_AVAILABILITY = ['available', 'unavailable', 'busy'];
const VALID_CURRENCIES   = ['KES','USD','GBP','EUR','TZS','UGX','ETB','ZAR','NGN','GHS'];

function svcError(code, msg, errors = null) {
  const e = new Error(msg);
  e.statusCode = code;
  e.errors = errors;
  return e;
}

function normalize(payload) {
  return {
    bio:                payload.bio             ? String(payload.bio).trim()             : null,
    location:           payload.location        ? String(payload.location).trim()        : null,
    skills:             payload.skills          ? String(payload.skills).trim()          : null,
    experienceLevel:    payload.experienceLevel ? String(payload.experienceLevel).trim() : null,
    portfolioUrl:       payload.portfolioUrl    ? String(payload.portfolioUrl).trim()    : null,
    availabilityStatus: payload.availabilityStatus
      ? String(payload.availabilityStatus).trim().toLowerCase()
      : 'available',
    // Rate fields (from migration 001)
    rateAmount:   payload.rateAmount != null ? Number(payload.rateAmount) : null,
    rateCurrency: payload.rateCurrency
      ? String(payload.rateCurrency).trim().toUpperCase()
      : 'KES',
    paymentModes: payload.paymentModes ? String(payload.paymentModes).trim() : null,
    // Profile photo / cover photo — either a data: URI (base64 image picked
    // on-device, no object storage configured for this project) or a
    // regular http(s) URL. Trimmed but not otherwise reformatted since a
    // data: URI is meaningful as one long string.
    avatarUrl: payload.avatarUrl ? String(payload.avatarUrl).trim() : null,
    coverUrl:  payload.coverUrl  ? String(payload.coverUrl).trim()  : null,
  };
}

// ~2MB of base64 (a bit under 1.5MB of actual image bytes) — generous for a
// profile/cover photo picked with client-side compression, while still
// keeping a hard ceiling so nobody can push an unbounded blob into Oracle.
const MAX_IMAGE_DATA_LENGTH = 2_000_000;

function isValidImageValue(value) {
  return /^data:image\/(png|jpe?g|webp|gif);base64,/.test(value) || /^https?:\/\//.test(value);
}

function validate(data) {
  const errors = [];
  if (data.bio           && data.bio.length           > 1000) errors.push('Bio cannot exceed 1000 characters.');
  if (data.location      && data.location.length      > 100)  errors.push('Location cannot exceed 100 characters.');
  if (data.skills        && data.skills.length        > 1000) errors.push('Skills cannot exceed 1000 characters.');
  if (data.experienceLevel && data.experienceLevel.length > 50) errors.push('Experience level cannot exceed 50 characters.');
  if (data.portfolioUrl  && data.portfolioUrl.length  > 255)  errors.push('Portfolio URL cannot exceed 255 characters.');
  if (!VALID_AVAILABILITY.includes(data.availabilityStatus))
    errors.push('Availability must be available, unavailable, or busy.');
  if (data.rateAmount !== null && (isNaN(data.rateAmount) || data.rateAmount < 0))
    errors.push('Rate must be a positive number.');
  if (!VALID_CURRENCIES.includes(data.rateCurrency))
    errors.push(`Currency must be one of: ${VALID_CURRENCIES.join(', ')}.`);
  if (data.paymentModes  && data.paymentModes.length  > 255)  errors.push('Payment modes cannot exceed 255 characters.');
  if (data.avatarUrl) {
    if (data.avatarUrl.length > MAX_IMAGE_DATA_LENGTH) errors.push('Profile photo is too large.');
    else if (!isValidImageValue(data.avatarUrl)) errors.push('Profile photo must be an image.');
  }
  if (data.coverUrl) {
    if (data.coverUrl.length > MAX_IMAGE_DATA_LENGTH) errors.push('Cover photo is too large.');
    else if (!isValidImageValue(data.coverUrl)) errors.push('Cover photo must be an image.');
  }
  return errors;
}

async function getMyProfile(userId) {
  return profileModel.findByUserId(userId); // returns null for new users — not a 404
}

async function upsertMyProfile(userId, payload) {
  const data   = normalize(payload);
  const errors = validate(data);
  if (errors.length) throw svcError(400, 'Profile data is invalid.', errors);

  const existing = await profileModel.findByUserId(userId);
  return existing
    ? profileModel.updateProfile(userId, data)
    : profileModel.createProfile(userId, data);
}

async function getProfileByUserId(userId) {
  const profile = await profileModel.findByUserId(userId);
  if (!profile) throw svcError(404, 'Profile not found.');
  return profile;
}

async function listFreelancers() {
  return profileModel.findFreelancers();
}

module.exports = { getMyProfile, getProfileByUserId, listFreelancers, upsertMyProfile };
