import { Router } from 'express';
import {
  createRequest,
  listRequests,
  getRequestById,
  updateRequestStatus,
  respondToMatch,
} from './requestController';
import { authenticateToken, optionalAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createBloodRequestSchema, updateBloodRequestStatusSchema } from './requestSchemas';

export const requestRouter = Router();

// Public / Authenticated search
requestRouter.get('/', optionalAuth, listRequests);
requestRouter.get('/:id', optionalAuth, getRequestById);

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

requestRouter.post(
  '/matches/:matchId/respond',
  authenticateToken,
  requireRole('DONOR'),
  respondToMatch
);
