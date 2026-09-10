import { Router } from 'express';
import { getUserNotifications, markAsRead } from './notificationController';
import { authenticateToken } from '../../middleware/auth';

export const notificationRouter = Router();

notificationRouter.use(authenticateToken);

notificationRouter.get('/', getUserNotifications);
notificationRouter.patch('/:id/read', markAsRead);
