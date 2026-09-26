import { Router } from 'express';
import {
  getHospitalProfile,
  updateHospitalProfile,
  getHospitalRequests,
  verifyDonorArrival,
  startDonation,
  completeDonation,
  confirmHospitalDonation,
  reportHospitalIssue,
} from './hospitalController';
import { authenticateToken, requireRole, requireVerified } from '../../middleware/auth';

export const hospitalRouter = Router();

hospitalRouter.use(authenticateToken);
hospitalRouter.use(requireRole('HOSPITAL', 'ADMIN', 'SUPER_ADMIN'));

hospitalRouter.get('/profile', getHospitalProfile);
hospitalRouter.patch('/profile', updateHospitalProfile);
hospitalRouter.get('/requests', getHospitalRequests);

// Complete hospital donation lifecycle endpoints
hospitalRouter.post('/verify-arrival', requireVerified, verifyDonorArrival);
hospitalRouter.post('/start-donation', requireVerified, startDonation);
hospitalRouter.post('/complete-donation', requireVerified, completeDonation);
hospitalRouter.post('/confirm-donation', requireVerified, confirmHospitalDonation);
hospitalRouter.post('/report-issue', requireVerified, reportHospitalIssue);
