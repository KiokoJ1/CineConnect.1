const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

function mapItem(row) {
  if (!row) return null;
  return {
    portfolioItemId: row.PORTFOLIO_ITEM_ID,
    userId:          row.USER_ID,
    mediaType:       row.MEDIA_TYPE,
    mediaUrl:        row.MEDIA_URL,
    thumbnailUrl:    row.THUMBNAIL_URL ?? null,
    title:           row.TITLE ?? null,
    description:     row.DESCRIPTION ?? null,
    isFeatured:      row.IS_FEATURED === 1,
    sortOrder:       row.SORT_ORDER ?? 0,
    createdAt:       row.CREATED_AT,
  };
}

const SELECT = `
  SELECT portfolio_item_id, user_id, media_type, media_url, thumbnail_url,
         title, description, is_featured, sort_order, created_at
  FROM portfolio_items
`;

/** Featured items first, then newest first — the order the profile grid and "Featured Work" rail both want. */
async function findByUserId(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `${SELECT}
       WHERE user_id = :userId
       ORDER BY is_featured DESC, sort_order ASC, created_at DESC`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows.map(mapItem);
  } finally {
    if (connection) await connection.close();
  }
}

async function findById(portfolioItemId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `${SELECT} WHERE portfolio_item_id = :portfolioItemId`,
      { portfolioItemId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return mapItem(result.rows[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function createItem(userId, data) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `INSERT INTO portfolio_items (
        user_id, media_type, media_url, thumbnail_url, title, description, is_featured
      ) VALUES (
        :userId, :mediaType, :mediaUrl, :thumbnailUrl, :title, :description, :isFeatured
      ) RETURNING portfolio_item_id INTO :itemId`,
      {
        userId,
        mediaType:    data.mediaType,
        mediaUrl:     { val: data.mediaUrl, type: oracledb.CLOB },
        thumbnailUrl: { val: data.thumbnailUrl ?? null, type: oracledb.CLOB },
        title:        data.title ?? null,
        description:  data.description ?? null,
        isFeatured:   data.isFeatured ? 1 : 0,
        itemId:       { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true },
    );
    return findById(result.outBinds.itemId[0]);
  } finally {
    if (connection) await connection.close();
  }
}

async function setFeatured(portfolioItemId, userId, isFeatured) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `UPDATE portfolio_items SET is_featured = :isFeatured
       WHERE portfolio_item_id = :portfolioItemId AND user_id = :userId`,
      { isFeatured: isFeatured ? 1 : 0, portfolioItemId, userId },
      { autoCommit: true },
    );
    if (!result.rowsAffected) return null;
    return findById(portfolioItemId);
  } finally {
    if (connection) await connection.close();
  }
}

async function deleteItem(portfolioItemId, userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `DELETE FROM portfolio_items WHERE portfolio_item_id = :portfolioItemId AND user_id = :userId`,
      { portfolioItemId, userId },
      { autoCommit: true },
    );
    return result.rowsAffected || 0;
  } finally {
    if (connection) await connection.close();
  }
}

/** How many items this user already has — used to cap portfolio size. */
async function countByUserId(userId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM portfolio_items WHERE user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return result.rows[0]?.CNT ?? 0;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { findByUserId, findById, createItem, setFeatured, deleteItem, countByUserId };
