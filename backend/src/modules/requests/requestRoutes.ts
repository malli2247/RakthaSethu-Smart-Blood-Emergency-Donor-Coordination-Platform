import { Router } from 'express';
import {
  createRequest,
  listRequests,
  getRequestById,
  updateRequestStatus,
  respondToMatch,
  startDonorTravel,
  markDonorArrived,
  confirmReceipt,
  getRequestTimeline,
} from './requestController';
import { authenticateToken, optionalAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createBloodRequestSchema, updateBloodRequestStatusSchema } from './requestSchemas';
import { startMatchingForRequest } from '../matching/matchingController';

export const requestRouter = Router();

// Public / Authenticated search
requestRouter.get('/', optionalAuth, listRequests);
requestRouter.get('/:id', optionalAuth, getRequestById);
requestRouter.get('/:id/timeline', optionalAuth, getRequestTimeline);

// Protected actions
requestRouter.post(
  '/',
  authenticateToken,
  validate({ body: createBloodRequestSchema }),
  createRequest
);

requestRouter.patch(
  '/:id/status',
  authenticateToken,
  validate({ body: updateBloodRequestStatusSchema }),
  updateRequestStatus
);

// Donor match actions
requestRouter.post(
  '/matches/:matchId/respond',
  authenticateToken,
  requireRole('DONOR'),
  respondToMatch
);

requestRouter.post(
  '/matches/:matchId/start-travel',
  authenticateToken,
  requireRole('DONOR'),
  startDonorTravel
);

requestRouter.post(
  '/matches/:matchId/arrived',
  authenticateToken,
  requireRole('DONOR'),
  markDonorArrived
);

// Receiver blood receipt confirmation
requestRouter.post(
  '/:id/confirm-receipt',
  authenticateToken,
  confirmReceipt
);

// Start progressive matching search for blood request
requestRouter.post(
  '/:id/matching/start',
  optionalAuth,
  startMatchingForRequest
);

