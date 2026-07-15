const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

// ─── Shared column list ───────────────────────────────────────────────────────
// Single source of truth — used by all SELECT queries.
// Includes rate_amount, rate_currency, payment_modes added in migration 001.
const SELECT_COLS = `
  p.profile_id,
  p.user_id,
  u.full_name,
  u.email,
  u.phone_number,
  u.role,
  p.bio,
  p.location,
  p.skills,
  p.experience_level,
  p.portfolio_url,
  p.availability_status,
  p.rate_amount,
  p.rate_currency,
  p.payment_modes,
  p.profile_photo,
  p.cover_photo,
  p.created_at,
  p.updated_at
`;

function mapProfile(row) {
  if (!row) return null;
  return {
    profileId:          row.PROFILE_ID,
    userId:             row.USER_ID,
    fullName:           row.FULL_NAME,
    email:              row.EMAIL,
    phoneNumber:        row.PHONE_NUMBER,
    role:               row.ROLE,
    bio:                row.BIO,
    location:           row.LOCATION,
    skills:             row.SKILLS,
    experienceLevel:    row.EXPERIENCE_LEVEL,
    portfolioUrl:       row.PORTFOLIO_URL,
    availabilityStatus: row.AVAILABILITY_STATUS,
    rateAmount:         row.RATE_AMOUNT   ?? null,
    rateCurrency:       row.RATE_CURRENCY ?? 'KES',
    paymentModes:       row.PAYMENT_MODES ?? null,
    profilePhoto:       row.PROFILE_PHOTO ?? null,
    coverPhoto:         row.COVER_PHOTO   ?? null,
    createdAt:          row.CREATED_AT,
    updatedAt:          row.UPDATED_AT,
  };
}

async function findByUserId(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT ${SELECT_COLS}
       FROM profiles p JOIN users u ON u.user_id = p.user_id
       WHERE p.user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return mapProfile(result.rows[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function findByProfileId(profileId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT ${SELECT_COLS}
       FROM profiles p JOIN users u ON u.user_id = p.user_id
       WHERE p.profile_id = :profileId`,
      { profileId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return mapProfile(result.rows[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function createProfile(userId, data) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO profiles (
        user_id, bio, location, skills, experience_level,
        portfolio_url, availability_status,
        rate_amount, rate_currency, payment_modes,
        profile_photo, cover_photo
      ) VALUES (
        :userId, :bio, :location, :skills, :experienceLevel,
        :portfolioUrl, :availabilityStatus,
        :rateAmount, :rateCurrency, :paymentModes,
        :profilePhoto, :coverPhoto
      ) RETURNING profile_id INTO :profileId`,
      {
        userId,
        bio:                data.bio,
        location:           data.location,
        skills:             data.skills,
        experienceLevel:    data.experienceLevel,
        portfolioUrl:       data.portfolioUrl,
        availabilityStatus: data.availabilityStatus,
        rateAmount:         data.rateAmount  ?? null,
        rateCurrency:       data.rateCurrency || 'KES',
        paymentModes:       data.paymentModes ?? null,
        profilePhoto:       { val: data.profilePhoto ?? null, type: oracledb.CLOB },
        coverPhoto:         { val: data.coverPhoto ?? null, type: oracledb.CLOB },
        profileId:          { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true },
    );
    return findByProfileId(result.outBinds.profileId[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function updateProfile(userId, data) {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `UPDATE profiles SET
        bio                = :bio,
        location           = :location,
        skills             = :skills,
        experience_level   = :experienceLevel,
        portfolio_url      = :portfolioUrl,
        availability_status = :availabilityStatus,
        rate_amount        = :rateAmount,
        rate_currency      = :rateCurrency,
        payment_modes      = :paymentModes,
        profile_photo      = :profilePhoto,
        cover_photo        = :coverPhoto
       WHERE user_id = :userId`,
      {
        userId,
        bio:                data.bio,
        location:           data.location,
        skills:             data.skills,
        experienceLevel:    data.experienceLevel,
        portfolioUrl:       data.portfolioUrl,
        availabilityStatus: data.availabilityStatus,
        rateAmount:         data.rateAmount  ?? null,
        rateCurrency:       data.rateCurrency || 'KES',
        paymentModes:       data.paymentModes ?? null,
        profilePhoto:       { val: data.profilePhoto ?? null, type: oracledb.CLOB },
        coverPhoto:         { val: data.coverPhoto ?? null, type: oracledb.CLOB },
      },
      { autoCommit: true },
    );
    return findByUserId(userId);
  } finally {
    if (connection) await connection.close();
  }
}

async function findFreelancers() {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT ${SELECT_COLS}
       FROM profiles p JOIN users u ON u.user_id = p.user_id
       WHERE u.role = 'freelancer' AND u.status = 'active'
       ORDER BY p.updated_at DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.map(mapProfile);
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { createProfile, findByProfileId, findByUserId, findFreelancers, updateProfile };
