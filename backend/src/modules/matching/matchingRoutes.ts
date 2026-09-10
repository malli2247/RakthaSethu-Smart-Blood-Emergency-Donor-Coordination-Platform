import { Router } from 'express';
import { findDonors, getMatchesForRequest, runMatchingForRequest } from './matchingController';
import { authenticateToken, optionalAuth } from '../../middleware/auth';

export const matchingRouter = Router();

// Public / optional auth donor search with privacy masking
matchingRouter.post('/find-donors', optionalAuth, findDonors);

// Protected routes for specific requests
matchingRouter.get('/request/:requestId', authenticateToken, getMatchesForRequest);
matchingRouter.post('/request/:requestId/run', authenticateToken, runMatchingForRequest);
