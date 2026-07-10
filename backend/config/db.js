const oracledb = require('oracledb');
const env = require('./env');

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
