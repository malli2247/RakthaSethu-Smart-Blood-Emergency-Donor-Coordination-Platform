import { Router } from 'express';
import {
  getHospitalProfile,
  updateHospitalProfile,
  getHospitalRequests,
  confirmHospitalDonation,
} from './hospitalController';
import { authenticateToken, requireRole, requireVerified } from '../../middleware/auth';

export const hospitalRouter = Router();

hospitalRouter.use(authenticateToken);
hospitalRouter.use(requireRole('HOSPITAL', 'ADMIN'));

hospitalRouter.get('/profile', getHospitalProfile);
hospitalRouter.patch('/profile', updateHospitalProfile);
hospitalRouter.get('/requests', getHospitalRequests);
hospitalRouter.post('/confirm-donation', requireVerified, confirmHospitalDonation);
