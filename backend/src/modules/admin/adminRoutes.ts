import { Router } from 'express';
import {
  getAdminStats,
  listAllUsers,
  getUserById,
  updateUserStatus,
  verifyOrganization,
  getVerificationRequests,
  getAuditLogs,
  getStuckRequests,
  resolveRequestIssue,
} from './adminController';
import { authenticateToken, requireRole } from '../../middleware/auth';

export const adminRouter = Router();

adminRouter.use(authenticateToken);
adminRouter.use(requireRole('ADMIN'));

adminRouter.get('/stats', getAdminStats);
adminRouter.get('/users', listAllUsers);
adminRouter.get('/users/:id', getUserById);
adminRouter.patch('/users/:id/status', updateUserStatus);
adminRouter.get('/verifications', getVerificationRequests);
adminRouter.patch('/verifications/:type/:id', verifyOrganization);
adminRouter.get('/audit-logs', getAuditLogs);
adminRouter.get('/stuck-requests', getStuckRequests);
adminRouter.post('/requests/:id/resolve', resolveRequestIssue);
