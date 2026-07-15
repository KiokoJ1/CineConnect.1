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
    // Base64 data URIs (e.g. "data:image/jpeg;base64,...") stored directly
    // in Oracle CLOB columns rather than an external file store — see
    // README.md's "Editable profile" section for why.
    profilePhoto: payload.profilePhoto ? String(payload.profilePhoto) : null,
    coverPhoto:   payload.coverPhoto   ? String(payload.coverPhoto)   : null,
  };
}

const MAX_PHOTO_CHARS = 6_000_000; // ~4.5MB decoded — generous for a compressed mobile photo

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
  for (const [field, label] of [['profilePhoto', 'Profile photo'], ['coverPhoto', 'Cover photo']]) {
    const value = data[field];
    if (!value) continue;
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(value)) {
      errors.push(`${label} must be a base64-encoded JPEG/PNG/WebP image.`);
    } else if (value.length > MAX_PHOTO_CHARS) {
      errors.push(`${label} is too large — please use a smaller image.`);
    }
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
