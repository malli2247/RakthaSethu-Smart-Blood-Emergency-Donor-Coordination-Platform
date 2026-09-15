import { Router } from 'express';
import {
  getPublicStatistics,
  getRecentActivity,
  getLiveInventory,
  getAdminAnalytics,
} from './statisticsController';
import { authenticateToken, requireRole } from '../../middleware/auth';

export const statisticsRouter = Router();

// Public platform statistics (cached, 100% database-driven)
statisticsRouter.get('/public', getPublicStatistics);
statisticsRouter.get('/activity', getRecentActivity);
statisticsRouter.get('/inventory', getLiveInventory);

// Admin detailed analytics
statisticsRouter.get('/admin', authenticateToken, requireRole('ADMIN'), getAdminAnalytics);
