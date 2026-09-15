import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import { AppError, sendSuccess } from './utils/response';

// Import route modules
import { authRouter } from './modules/auth/authRoutes';
import { matchingRouter } from './modules/matching/matchingRoutes';
import { requestRouter } from './modules/requests/requestRoutes';
import { donorRouter } from './modules/donors/donorRoutes';
import { hospitalRouter } from './modules/hospitals/hospitalRoutes';
import { bloodBankRouter } from './modules/bloodbanks/bloodBankRoutes';
import { campaignRouter } from './modules/campaigns/campaignRoutes';
import { volunteerRouter } from './modules/volunteers/volunteerRoutes';
import { notificationRouter } from './modules/notifications/notificationRoutes';
import { adminRouter } from './modules/admin/adminRoutes';
import compression from 'compression';
import { aiRouter } from './modules/ai/aiRoutes';
import { uploadRouter } from './modules/uploads/uploadRoutes';
import { emergencyRouter } from './modules/emergency/emergencyRoutes';
import { coordinationRouter } from './modules/coordination/coordinationRoutes';
import { statisticsRouter } from './modules/statistics/statisticsRoutes';
import { CacheService } from './services/cacheService';
import { TaskQueueService } from './services/taskQueueService';

export function createApp(): Express {
  const app: Express = express();

  // Enable strong ETags for HTTP 304 Not Modified caching
  app.set('etag', 'strong');

  // HTTP Response Compression (Gzip / Deflate for payloads > 1KB)
  if (config.scaling?.enableCompression !== false) {
    app.use(
      compression({
        threshold: 1024,
        filter: (req, res) => {
          if (req.headers['x-no-compression']) return false;
          return compression.filter(req, res);
        },
      })
    );
  }

  // Security headers & CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // High-throughput rate limiting (with loopback dev exemption)
  app.use(generalLimiter);

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static uploads directory with security headers
  app.use(
    '/uploads',
    (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      next();
    },
    express.static(config.storage.uploadDir)
  );

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'healthy',
      service: 'RakthaSethu API',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  });

  // System performance, caching, and concurrency metrics endpoint
  app.get('/api/system/metrics', (req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    sendSuccess(res, {
      status: 'operational',
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round(memUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
      cache: CacheService.getMetrics(),
      taskQueue: TaskQueueService.getStats(),
      processId: process.pid,
    });
  });

  // Mount API modules
  app.use('/api/auth', authRouter);
  app.use('/api/matching', matchingRouter);
  app.use('/api/requests', requestRouter);
  app.use('/api/donors', donorRouter);
  app.use('/api/hospitals', hospitalRouter);
  app.use('/api/blood-banks', bloodBankRouter);
  app.use('/api/campaigns', campaignRouter);
  app.use('/api/volunteers', volunteerRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/uploads', uploadRouter);
  app.use('/api/emergency', emergencyRouter);
  app.use('/api/coordination', coordinationRouter);
  app.use('/api/statistics', statisticsRouter);

  // 404 Handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
