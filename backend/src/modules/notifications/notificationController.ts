import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/response';

export async function getUserNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    sendSuccess(res, {
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      sendSuccess(res, null, 'All notifications marked as read');
      return;
    }

    const updated = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    sendSuccess(res, updated, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
}
