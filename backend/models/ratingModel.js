const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

function mapRating(row) {
  if (!row) return null;
  return {
    ratingId:     row.RATING_ID,
    projectId:    row.PROJECT_ID,
    projectTitle: row.PROJECT_TITLE,
    reviewerId:   row.REVIEWER_ID,
    reviewerName: row.REVIEWER_NAME,
    revieweeId:   row.REVIEWEE_ID,
    score:        row.SCORE,
    reviewText:   row.REVIEW_TEXT,
    createdAt:    row.CREATED_AT,
  };
}

async function createRating(data) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO ratings (project_id, reviewer_id, reviewee_id, score, review_text)
       VALUES (:projectId, :reviewerId, :revieweeId, :score, :reviewText)
       RETURNING rating_id INTO :ratingId`,
      {
        projectId:  data.projectId,
        reviewerId: data.reviewerId,
        revieweeId: data.revieweeId,
        score:      data.score,
        reviewText: data.reviewText || null,
        ratingId:   { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true },
    );
    return findById(result.outBinds.ratingId[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function findById(ratingId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT r.rating_id, r.project_id, p.title AS project_title,
              r.reviewer_id, u.full_name AS reviewer_name,
              r.reviewee_id, r.score, r.review_text, r.created_at
       FROM ratings r
       JOIN projects p ON p.project_id = r.project_id
       JOIN users u    ON u.user_id    = r.reviewer_id
       WHERE r.rating_id = :ratingId`,
      { ratingId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return mapRating(result.rows[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function findByReviewee(revieweeId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT r.rating_id, r.project_id, p.title AS project_title,
              r.reviewer_id, u.full_name AS reviewer_name,
              r.reviewee_id, r.score, r.review_text, r.created_at
       FROM ratings r
       JOIN projects p ON p.project_id = r.project_id
       JOIN users u    ON u.user_id    = r.reviewer_id
       WHERE r.reviewee_id = :revieweeId
       ORDER BY r.created_at DESC`,
      { revieweeId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.map(mapRating);
  } finally {
    if (connection) await connection.close();
  }
}

async function getAverageScore(revieweeId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT ROUND(AVG(score), 1) AS avg_score, COUNT(*) AS total
       FROM ratings WHERE reviewee_id = :revieweeId`,
      { revieweeId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return {
      avgScore: result.rows[0]?.AVG_SCORE ?? null,
      total:    Number(result.rows[0]?.TOTAL ?? 0),
    };
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { createRating, findById, findByReviewee, getAverageScore };
