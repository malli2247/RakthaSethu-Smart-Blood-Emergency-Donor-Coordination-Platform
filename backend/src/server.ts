import cluster from 'node:cluster';
import os from 'node:os';
import { createApp } from './app';
import { config, validateEnvironment } from './config';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

async function startWorker() {
  // Validate startup environment and sanity checks
  validateEnvironment();

  const app = createApp();

  // Attempt database connection
  await connectDatabase();

  const server = app.listen(config.port, () => {
    logger.info(`=========================================`);
    logger.info(`🩸 RakthaSethu Backend API Server Active`);
    logger.info(`📡 URL: http://localhost:${config.port}`);
    logger.info(`🏥 Environment: ${config.nodeEnv}`);
    logger.info(`⚙️ Process ID: ${process.pid}`);
    logger.info(`⚡ Rate Limit: ${config.rateLimit.max} reqs / min`);
    logger.info(`=========================================`);
  });

  const shutdown = async () => {
    console.log(`\nProcess ${process.pid} shutting down gracefully...`);
    server.close(() => {
      console.log(`Process ${process.pid} HTTP server closed.`);
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Master / Cluster Manager
if (config.scaling?.clusterMode && cluster.isPrimary) {
  const numWorkers = config.scaling.workers > 0 ? config.scaling.workers : Math.max(1, os.cpus().length);
  logger.info(`🚀 Starting RakthaSethu High-Throughput Cluster Mode`);
  logger.info(`🔥 Spawning ${numWorkers} worker process(es) across available CPU cores...`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`⚠️ Worker process ${worker.process.pid} exited (code: ${code}, signal: ${signal}). Auto-restarting...`);
    cluster.fork();
  });
} else {
  // Single-process or worker instance
  startWorker().catch((err) => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}
