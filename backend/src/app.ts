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
import { aiRouter } from './modules/ai/aiRoutes';

export function createApp(): Express {
  const app: Express = express();

  // Security headers & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate Limiting
  app.use(generalLimiter);

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'healthy',
      service: 'RakthaSethu API',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
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

  // 404 Handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
