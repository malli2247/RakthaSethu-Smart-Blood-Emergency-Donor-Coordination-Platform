import { Router } from 'express';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  clearReadNotifications,
  streamNotifications,
} from './notificationController';
import { authenticateToken, optionalAuth } from '../../middleware/auth';

export const notificationRouter = Router();

// Real-time SSE stream endpoint (authenticates via query parameter ?token= or Authorization header)
notificationRouter.get('/stream', optionalAuth, streamNotifications);

// Protected REST endpoints
notificationRouter.use(authenticateToken);

notificationRouter.get('/', getUserNotifications);
notificationRouter.get('/unread-count', getUnreadCount);
notificationRouter.patch('/:id/read', markAsRead);
notificationRouter.delete('/clear-read', clearReadNotifications);
notificationRouter.delete('/:id', deleteNotification);
