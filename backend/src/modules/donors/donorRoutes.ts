import { Router } from 'express';
import {
  getDonorProfile,
  updateDonorProfile,
  getDonorStats,
  getDonorMatches,
  getDonationHistory,
  recordPastDonation,
  updateDonorConsent,
  withdrawDonorConsent,
} from './donorController';
import { authenticateToken, requireRole } from '../../middleware/auth';

export const donorRouter = Router();

donorRouter.use(authenticateToken);
donorRouter.use(requireRole('DONOR', 'ADMIN'));

donorRouter.get('/profile', getDonorProfile);
donorRouter.patch('/profile', updateDonorProfile);
donorRouter.patch('/consent', updateDonorConsent);
donorRouter.post('/consent/withdraw', withdrawDonorConsent);
donorRouter.get('/stats', getDonorStats);
donorRouter.get('/matches', getDonorMatches);
donorRouter.get('/history', getDonationHistory);
donorRouter.post('/record-donation', recordPastDonation);
