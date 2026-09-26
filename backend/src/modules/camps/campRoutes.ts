import { Router } from 'express';
import {
  listCamps,
  getCampById,
  createCamp,
  registerForCamp,
  cancelRegistration,
  triggerSourceSync,
  batchImportCamps,
  getSyncStatus,
  verifyCamp,
  rejectCamp,
  cancelCamp,
} from './campController';
import { authenticateToken, optionalAuth, requireRole } from '../../middleware/auth';

export const campRouter = Router();

// Admin operations (placed before /:id parameterized routes to avoid Express route conflict)
campRouter.post('/admin/sync', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), triggerSourceSync);
campRouter.post('/admin/import', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), batchImportCamps);
campRouter.get('/admin/sync-status', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), getSyncStatus);
campRouter.patch('/admin/:id/verify', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), verifyCamp);
campRouter.patch('/admin/:id/reject', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), rejectCamp);
campRouter.patch('/admin/:id/cancel', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), cancelCamp);

// Public location-aware camp discovery
campRouter.get('/', optionalAuth, listCamps);
campRouter.get('/:id', optionalAuth, getCampById);

// Hospital & Blood Bank camp creation
campRouter.post(
  '/',
  authenticateToken,
  requireRole('ADMIN', 'SUPER_ADMIN', 'HOSPITAL', 'BLOOD_BANK'),
  createCamp
);

// Donor registration for verified camps
campRouter.post('/:id/register', authenticateToken, registerForCamp);
campRouter.delete('/:id/register', authenticateToken, cancelRegistration);
