const portfolioModel = require('../models/portfolioModel');

const VALID_MEDIA_TYPES = ['image', 'video'];
const MAX_ITEMS_PER_USER = 30;
// ~2MB of base64 — same cap as the profile/cover photo (see PROFILE_EDITING.md).
const MAX_IMAGE_DATA_LENGTH = 2_000_000;

function svcError(code, msg, errors = null) {
  const e = new Error(msg);
  e.statusCode = code;
  e.errors = errors;
  return e;
}

function isDataImageUri(value) {
  return /^data:image\/(png|jpe?g|webp|gif);base64,/.test(value);
}
function isHttpUrl(value) {
  return /^https?:\/\//.test(value);
}

function normalize(payload) {
  return {
    mediaType:    String(payload.mediaType || '').trim().toLowerCase(),
    mediaUrl:     payload.mediaUrl ? String(payload.mediaUrl).trim() : '',
    thumbnailUrl: payload.thumbnailUrl ? String(payload.thumbnailUrl).trim() : null,
    title:        payload.title ? String(payload.title).trim() : null,
    description:  payload.description ? String(payload.description).trim() : null,
    isFeatured:   !!payload.isFeatured,
  };
}

function validate(data) {
  const errors = [];

  if (!VALID_MEDIA_TYPES.includes(data.mediaType)) {
    errors.push('Media type must be image or video.');
  }

  if (!data.mediaUrl) {
    errors.push('Media is required.');
  } else if (data.mediaType === 'image') {
    if (data.mediaUrl.length > MAX_IMAGE_DATA_LENGTH) errors.push('Image is too large.');
    else if (!isDataImageUri(data.mediaUrl) && !isHttpUrl(data.mediaUrl)) {
      errors.push('Image must be a photo or an image URL.');
    }
  } else if (data.mediaType === 'video') {
    // Raw video bytes are never stored in Oracle — always a link (YouTube,
    // Vimeo, or any other hosted URL).
    if (!isHttpUrl(data.mediaUrl)) errors.push('Video must be a URL (e.g. YouTube or Vimeo link).');
  }

  if (data.thumbnailUrl && data.thumbnailUrl.length > MAX_IMAGE_DATA_LENGTH) {
    errors.push('Thumbnail is too large.');
  } else if (data.thumbnailUrl && !isDataImageUri(data.thumbnailUrl) && !isHttpUrl(data.thumbnailUrl)) {
    errors.push('Thumbnail must be an image.');
  }

  if (data.title && data.title.length > 200) errors.push('Title cannot exceed 200 characters.');
  if (data.description && data.description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters.');
  }

  return errors;
}

async function listForUser(userId) {
  return portfolioModel.findByUserId(userId);
}

async function addItem(userId, payload) {
  const data = normalize(payload);
  const errors = validate(data);
  if (errors.length) throw svcError(400, 'Portfolio item is invalid.', errors);

  const count = await portfolioModel.countByUserId(userId);
  if (count >= MAX_ITEMS_PER_USER) {
    throw svcError(400, `You can only have up to ${MAX_ITEMS_PER_USER} portfolio items.`);
  }

  return portfolioModel.createItem(userId, data);
}

async function setFeatured(userId, portfolioItemId, isFeatured) {
  const updated = await portfolioModel.setFeatured(portfolioItemId, userId, !!isFeatured);
  if (!updated) throw svcError(404, 'Portfolio item not found.');
  return updated;
}

async function deleteItem(userId, portfolioItemId) {
  const deleted = await portfolioModel.deleteItem(portfolioItemId, userId);
  if (!deleted) throw svcError(404, 'Portfolio item not found.');
}

module.exports = { listForUser, addItem, setFeatured, deleteItem };
