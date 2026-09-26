import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';
import { RealtimeNotificationService } from '../../services/realtimeNotificationService';
import { WebPushService } from '../../services/webPushService';
import { config } from '../../config';

export async function getUserNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { filter = 'all', page = 1, limit = 40 } = req.query;

    const where: any = { userId };

    if (filter === 'unread') {
      where.isRead = false;
    } else if (filter === 'critical') {
      where.priority = { in: ['CRITICAL', 'URGENT'] };
    } else if (filter === 'requests') {
      where.category = { in: ['EMERGENCY', 'MATCH'] };
    } else if (filter === 'donations') {
      where.category = 'DONATION';
    } else if (filter === 'system') {
      where.category = { in: ['SYSTEM', 'ACCOUNT'] };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, totalCount, unreadCount, criticalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      prisma.notification.count({
        where: { userId, isRead: false, priority: { in: ['CRITICAL', 'URGENT'] } },
      }),
    ]);

    sendSuccess(res, {
      notifications,
      unreadCount,
      criticalCount,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const [unreadCount, criticalCount] = await Promise.all([
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      prisma.notification.count({
        where: { userId, isRead: false, priority: { in: ['CRITICAL', 'URGENT'] } },
      }),
    ]);

    sendSuccess(res, { unreadCount, criticalCount });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const now = new Date();

    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: now },
      });

      // Broadcast unread count 0 to other tabs via SSE
      RealtimeNotificationService.sendToUser(userId, 'count_update', { unreadCount: 0, criticalCount: 0 });

      sendSuccess(res, null, 'All notifications marked as read');
      return;
    }

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: now },
    });

    const [newUnreadCount, newCriticalCount] = await Promise.all([
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.count({ where: { userId, isRead: false, priority: { in: ['CRITICAL', 'URGENT'] } } }),
    ]);

    RealtimeNotificationService.sendToUser(userId, 'count_update', {
      unreadCount: newUnreadCount,
      criticalCount: newCriticalCount,
    });

    sendSuccess(res, { unreadCount: newUnreadCount }, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
}

export async function deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await prisma.notification.deleteMany({
      where: { id, userId },
    });

    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
    RealtimeNotificationService.sendToUser(userId, 'count_update', { unreadCount });

    sendSuccess(res, null, 'Notification removed');
  } catch (error) {
    next(error);
  }
}

export async function clearReadNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });

    sendSuccess(res, { count: result.count }, 'Read notifications cleared');
  } catch (error) {
    next(error);
  }
}

/**
 * Server-Sent Events (SSE) stream endpoint for instant real-time notification push
 */
export async function streamNotifications(req: Request, res: Response): Promise<void> {
  let user: any = req.user;

  // Browser EventSource does not support custom Authorization headers directly,
  // so support passing the Bearer token as ?token=... in the query string
  if (!user && req.query.token) {
    try {
      const decoded = jwt.verify(String(req.query.token), config.jwt.accessSecret);
      user = decoded;
    } catch {
      res.status(401).json({ success: false, message: 'Invalid token for real-time stream' });
      return;
    }
  }

  if (!user || !user.id) {
    res.status(401).json({ success: false, message: 'Authentication required for SSE stream' });
    return;
  }

  RealtimeNotificationService.addClient(user.id, user.role, res);
}

/**
 * Returns VAPID public key for frontend subscription
 */
export async function getVapidPublicKey(req: Request, res: Response): Promise<void> {
  const publicKey = config.push.vapidPublicKey || '';
  if (!publicKey) {
    res.status(503).json({
      success: false,
      message: 'VAPID public key is missing on the server.',
    });
    return;
  }
  sendSuccess(res, {
    publicKey,
    vapidPublicKey: publicKey,
  });
}

/**
 * Register or update push subscription for the authenticated user
 */
export async function registerPushSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { endpoint, keys, userAgent, deviceType } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new AppError('Valid PushSubscription with endpoint and keys is required', 400);
    }

    const subscription = await WebPushService.registerSubscription(userId, {
      endpoint,
      keys,
      userAgent: userAgent || req.headers['user-agent'],
      deviceType: deviceType || 'DESKTOP',
    });

    sendSuccess(res, subscription, 'Push subscription registered successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Revoke push subscription
 */
export async function revokePushSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const endpoint = req.body?.endpoint || (req.query?.endpoint as string);

    if (!endpoint) {
      throw new AppError('Endpoint is required to revoke subscription', 400);
    }

    await WebPushService.revokeSubscription(endpoint, userId);
    sendSuccess(res, null, 'Push subscription revoked');
  } catch (error) {
    next(error);
  }
}

/**
 * Track user notification click
 */
export async function trackNotificationClick(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { notificationId, endpoint } = req.body;
    if (notificationId) {
      await WebPushService.recordClick(notificationId, endpoint);
    }
    sendSuccess(res, null, 'Click recorded');
  } catch (error) {
    next(error);
  }
}

/**
 * Get notification preferences for authenticated user
 */
export async function getNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId },
      });
    }

    sendSuccess(res, prefs);
  } catch (error) {
    next(error);
  }
}

/**
 * Update notification preferences for authenticated user
 */
export async function updateNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const {
      pushEnabled,
      soundEnabled,
      vibrationEnabled,
      emergencyAlerts,
      bloodRequests,
      donationUpdates,
      systemAlerts,
      campaignAlerts,
    } = req.body;

    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...(pushEnabled !== undefined && { pushEnabled: Boolean(pushEnabled) }),
        ...(soundEnabled !== undefined && { soundEnabled: Boolean(soundEnabled) }),
        ...(vibrationEnabled !== undefined && { vibrationEnabled: Boolean(vibrationEnabled) }),
        ...(emergencyAlerts !== undefined && { emergencyAlerts: Boolean(emergencyAlerts) }),
        ...(bloodRequests !== undefined && { bloodRequests: Boolean(bloodRequests) }),
        ...(donationUpdates !== undefined && { donationUpdates: Boolean(donationUpdates) }),
        ...(systemAlerts !== undefined && { systemAlerts: Boolean(systemAlerts) }),
        ...(campaignAlerts !== undefined && { campaignAlerts: Boolean(campaignAlerts) }),
      },
      update: {
        ...(pushEnabled !== undefined && { pushEnabled: Boolean(pushEnabled) }),
        ...(soundEnabled !== undefined && { soundEnabled: Boolean(soundEnabled) }),
        ...(vibrationEnabled !== undefined && { vibrationEnabled: Boolean(vibrationEnabled) }),
        ...(emergencyAlerts !== undefined && { emergencyAlerts: Boolean(emergencyAlerts) }),
        ...(bloodRequests !== undefined && { bloodRequests: Boolean(bloodRequests) }),
        ...(donationUpdates !== undefined && { donationUpdates: Boolean(donationUpdates) }),
        ...(systemAlerts !== undefined && { systemAlerts: Boolean(systemAlerts) }),
        ...(campaignAlerts !== undefined && { campaignAlerts: Boolean(campaignAlerts) }),
      },
    });

    sendSuccess(res, updated, 'Notification preferences updated');
  } catch (error) {
    next(error);
  }
}

/**
 * Send test push notification to user's registered devices
 */
export async function sendTestPush(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const testNotification = await prisma.notification.create({
      data: {
        userId,
        title: '🧪 RakthaSethu Push Test',
        message: 'Web push notifications are working in real-time across your devices!',
        priority: 'HIGH',
        category: 'SYSTEM',
        link: '/notifications',
        actionUrl: '/notifications',
      },
    });

    await WebPushService.sendToUser(userId, {
      id: testNotification.id,
      title: testNotification.title,
      message: testNotification.message,
      priority: 'HIGH',
      category: 'SYSTEM',
      actionUrl: '/notifications',
    });

    sendSuccess(res, { notificationId: testNotification.id }, 'Test push dispatched');
  } catch (error) {
    next(error);
  }
}
