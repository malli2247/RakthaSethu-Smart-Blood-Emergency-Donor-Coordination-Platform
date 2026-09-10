import { createApp } from './app';
import { config } from './config';
import { connectDatabase } from './config/database';

async function bootstrap() {
  const app = createApp();

  // Attempt database connection
  await connectDatabase();

  const server = app.listen(config.port, () => {
    console.log(`=========================================`);
    console.log(`🩸 RakthaSethu Backend API Server Active`);
    console.log(`📡 URL: http://localhost:${config.port}`);
    console.log(`🏥 Environment: ${config.nodeEnv}`);
    console.log(`=========================================`);
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
