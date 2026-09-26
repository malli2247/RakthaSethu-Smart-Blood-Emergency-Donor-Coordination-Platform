import { Router } from 'express';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  clearReadNotifications,
  streamNotifications,
  getVapidPublicKey,
  registerPushSubscription,
  revokePushSubscription,
  trackNotificationClick,
  getNotificationPreferences,
  updateNotificationPreferences,
  sendTestPush,
} from './notificationController';
import { authenticateToken, optionalAuth } from '../../middleware/auth';

export const notificationRouter = Router();

// VAPID public key discovery
notificationRouter.get('/vapid-public-key', getVapidPublicKey);

// Real-time SSE stream endpoint (authenticates via query parameter ?token= or Authorization header)
notificationRouter.get('/stream', optionalAuth, streamNotifications);

// Track notification click (optional auth / endpoint lookup)
notificationRouter.post('/track-click', trackNotificationClick);

// Protected REST endpoints
notificationRouter.use(authenticateToken);

// Push subscription management
notificationRouter.post('/push-subscription', registerPushSubscription);
notificationRouter.delete('/push-subscription', revokePushSubscription);
notificationRouter.post('/test-push', sendTestPush);

// User notification preferences
notificationRouter.get('/preferences', getNotificationPreferences);
notificationRouter.patch('/preferences', updateNotificationPreferences);

notificationRouter.get('/', getUserNotifications);
notificationRouter.get('/unread-count', getUnreadCount);
notificationRouter.patch('/:id/read', markAsRead);
notificationRouter.delete('/clear-read', clearReadNotifications);
notificationRouter.delete('/:id', deleteNotification);

