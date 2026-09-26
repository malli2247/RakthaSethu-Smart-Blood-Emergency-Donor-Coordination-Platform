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
statisticsRouter.get('/inventory', getLiveInventory);

// Activity feed strictly requires authentication and role-scoping:
// Unauthenticated / public callers receive 401 Unauthorized.
// Roles receive strictly scoped, authorized operational events.
statisticsRouter.get('/activity', authenticateToken, getRecentActivity);

// Admin detailed analytics
statisticsRouter.get('/admin', authenticateToken, requireRole('ADMIN'), getAdminAnalytics);
