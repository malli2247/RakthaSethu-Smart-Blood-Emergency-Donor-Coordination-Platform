import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';
import { RealtimeNotificationService } from '../../services/realtimeNotificationService';
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
