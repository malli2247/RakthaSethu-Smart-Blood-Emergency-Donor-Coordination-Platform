import { createApp } from './app';
import { config, validateEnvironment } from './config';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

async function bootstrap() {
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
    logger.info(`=========================================`);
  });

  const shutdown = async () => {
    console.log('\nShutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
