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

// Progressive Donor Search Lifecycle Endpoints
matchingRouter.post('/search/start', optionalAuth, startMatchingForRequest);
matchingRouter.get('/search/:searchId/stream', optionalAuth, streamProgressiveSearch);
matchingRouter.get('/search/:searchId', optionalAuth, getProgressiveSearchSnapshot);
matchingRouter.post('/search/:searchId/cancel', optionalAuth, cancelProgressiveSearch);
matchingRouter.post('/search/:searchId/continue', optionalAuth, continueProgressiveSearch);

// Request-specific progressive matching routes
matchingRouter.post('/request/:requestId/start', optionalAuth, startMatchingForRequest);
matchingRouter.get('/request/:requestId', authenticateToken, getMatchesForRequest);
matchingRouter.post('/request/:requestId/run', authenticateToken, runMatchingForRequest);
