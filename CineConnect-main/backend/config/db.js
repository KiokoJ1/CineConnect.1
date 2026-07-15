const oracledb = require('oracledb');
const env = require('./env');

// profiles.avatar_url / profiles.cover_url are CLOB (they hold base64 data:
// URIs, too large for VARCHAR2) — without this, node-oracledb returns CLOB
// columns as Lob stream objects instead of plain strings, which breaks
// every existing `row.SOME_COLUMN` access pattern and JSON serialization.
oracledb.fetchAsString = [oracledb.CLOB];

async function initializePool() {
  await oracledb.createPool({
    user: env.db.user,
    password: env.db.password,
    connectString: env.db.connectString,
    poolMin: env.db.poolMin,
    poolMax: env.db.poolMax,
    poolIncrement: env.db.poolIncrement,
  });
}

async function getConnection() {
  return oracledb.getConnection();
}

async function closePool() {
  try {
    const pool = oracledb.getPool();
    await pool.close(10);
  } catch (error) {
    if (error.message && error.message.includes('NJS-047')) {
      return;
    }

    console.error('Failed to close Oracle connection pool:', error.message);
  }
}

module.exports = {
  initializePool,
  getConnection,
  closePool,
};
