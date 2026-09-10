import { Router } from 'express';
import {
  getVolunteerProfile,
  updateVolunteerProfile,
  getEmergencyCoordinationTasks,
} from './volunteerController';
import { authenticateToken, requireRole } from '../../middleware/auth';

export const volunteerRouter = Router();

volunteerRouter.use(authenticateToken);
volunteerRouter.use(requireRole('VOLUNTEER', 'ADMIN'));

volunteerRouter.get('/profile', getVolunteerProfile);
volunteerRouter.patch('/profile', updateVolunteerProfile);
volunteerRouter.get('/tasks', getEmergencyCoordinationTasks);
