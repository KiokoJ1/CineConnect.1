const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { initializePool, closePool } = require('./config/db');
const { initSocket } = require('./services/socketService');

let server;

async function startServer() {
  try {
    await initializePool();

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    server = httpServer.listen(env.port, () => {
      console.log(`CineConnect_KE API running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start CineConnect_KE API:', error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down CineConnect_KE API...`);

  if (server) {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    return;
  }

  await closePool();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
