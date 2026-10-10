import { Router } from 'express';
import {
  findDonors,
  getMatchesForRequest,
  runMatchingForRequest,
  startMatchingForRequest,
  streamProgressiveSearch,
  getProgressiveSearchSnapshot,
  cancelProgressiveSearch,
  continueProgressiveSearch,
} from './matchingController';
import { authenticateToken, optionalAuth } from '../../middleware/auth';

export const matchingRouter = Router();

// Public / optional auth donor search with privacy masking
matchingRouter.post('/find-donors', optionalAuth, findDonors);

// Progressive Donor Search Lifecycle Endpoints (Protected with strict RBAC)
matchingRouter.post('/search/start', authenticateToken, startMatchingForRequest);
matchingRouter.get('/search/:searchId/stream', authenticateToken, streamProgressiveSearch);
matchingRouter.get('/search/:searchId', authenticateToken, getProgressiveSearchSnapshot);
matchingRouter.post('/search/:searchId/cancel', authenticateToken, cancelProgressiveSearch);
matchingRouter.post('/search/:searchId/continue', authenticateToken, continueProgressiveSearch);

// Request-specific progressive matching routes
matchingRouter.post('/request/:requestId/start', authenticateToken, startMatchingForRequest);
matchingRouter.get('/request/:requestId', authenticateToken, getMatchesForRequest);
matchingRouter.post('/request/:requestId/run', authenticateToken, runMatchingForRequest);
