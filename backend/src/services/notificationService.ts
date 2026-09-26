import { prisma } from '../config/database';
import { EmailService } from './emailService';
import { SmsService } from './smsService';
import { logger } from '../utils/logger';
import { RealtimeNotificationService } from './realtimeNotificationService';
import { WebPushService } from './webPushService';

export interface DispatchNotificationOptions {
  userId: string;
  title: string;
  message: string;
  type?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
  category?: 'EMERGENCY' | 'MATCH' | 'DONATION' | 'INVENTORY' | 'SYSTEM' | 'ACCOUNT';
  link?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
  deliveryChannel?: 'IN_APP' | 'ALL';
  email?: {
    to: string;
    subject: string;
    html: string;
  };
  sms?: {
    to: string;
    message: string;
  };
}

export class NotificationService {
  /**
   * Determine default priority from notification type if not explicitly supplied
   */
  private static resolvePriority(
    type: string,
    explicitPriority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL'
  ): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL' {
    if (explicitPriority) return explicitPriority;

    if (type.includes('CRITICAL') || type === 'EMERGENCY_ALERT') {
      return 'CRITICAL';
    }
    if (type.includes('URGENT') || type.includes('MATCH') || type === 'DONOR_ACCEPTED') {
      return 'URGENT';
    }
    if (type.includes('SHORTAGE') || type.includes('CONFIRMED') || type.includes('FULFILLED')) {
      return 'HIGH';
    }
    return 'NORMAL';
  }

  /**
   * Determine default category from notification type
   */
  private static resolveCategory(
    type: string,
    explicitCategory?: 'EMERGENCY' | 'MATCH' | 'DONATION' | 'INVENTORY' | 'SYSTEM' | 'ACCOUNT'
  ): string {
    if (explicitCategory) return explicitCategory;

    if (type.includes('EMERGENCY') || type.includes('CRITICAL') || type.includes('URGENT') || type.includes('BLOOD_REQUEST')) {
      return 'EMERGENCY';
    }
    if (type.includes('MATCH') || type.includes('DONOR')) {
      return 'MATCH';
    }
    if (type.includes('DONATION')) {
      return 'DONATION';
    }
    if (type.includes('INVENTORY') || type.includes('SHORTAGE')) {
      return 'INVENTORY';
    }
    if (type.includes('VERIFICATION') || type.includes('ACCOUNT')) {
      return 'ACCOUNT';
    }
    return 'SYSTEM';
  }

  /**
   * Dispatches notifications across multiple channels with anti-spam deduplication and live SSE broadcast.
   */
  static async notify(options: DispatchNotificationOptions): Promise<any> {
    const {
      userId,
      title,
      message,
      type = 'SYSTEM_NOTICE',
      link,
      actionUrl,
      metadata,
      expiresAt,
      deliveryChannel = 'IN_APP',
      email,
      sms,
    } = options;

    const priority = this.resolvePriority(type, options.priority);
    const category = this.resolveCategory(type, options.category);
    const targetActionUrl = actionUrl || link || null;

    // 1. Anti-spam deduplication check: avoid creating duplicate unread notifications
    // within 5 minutes for the same user, type, and title
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const duplicate = await prisma.notification.findFirst({
        where: {
          userId,
          type,
          title,
          isRead: false,
          createdAt: { gte: fiveMinutesAgo },
        },
      });

      if (duplicate) {
        logger.info(`[NotificationService] Suppressed duplicate notification for user ${userId} (${type})`);
        return duplicate;
      }
    } catch {
      // Continue if deduplication check encounters an issue
    }

    // 2. Persist in-app notification in database
    let createdNotification: any = null;
    try {
      createdNotification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type: type as any,
          priority,
          category,
          link: targetActionUrl,
          actionUrl: targetActionUrl,
          metadata: metadata ? JSON.stringify(metadata) : null,
          expiresAt: expiresAt || null,
          deliveryChannel,
        },
      });
    } catch (dbErr) {
      logger.error(`[NotificationService] Database notification save failed for user ${userId}`, dbErr);
    }

    // 3. Immediately broadcast real-time event to active SSE clients
    if (createdNotification) {
      try {
        const unreadCount = await prisma.notification.count({
          where: { userId, isRead: false },
        });

        RealtimeNotificationService.sendToUser(userId, 'notification', {
          notification: createdNotification,
          unreadCount,
        });
      } catch (sseErr) {
        logger.warn(`[NotificationService] SSE broadcast warning for user ${userId}:`, sseErr);
      }

      // 4. Dispatch Web Push notification to registered background/offline devices
      WebPushService.sendToUser(userId, {
        id: createdNotification.id,
        title,
        message,
        priority,
        category,
        actionUrl: targetActionUrl || undefined,
        metadata,
      }).catch((pushErr) => {
        logger.error(`[NotificationService] Web Push delivery error for user ${userId}:`, pushErr);
      });
    }

    // 5. Dispatch Email asynchronously if provided
    if (email && email.to) {
      EmailService.sendMail({
        to: email.to,
        subject: email.subject,
        html: email.html,
      }).catch((err) => {
        logger.error(`[NotificationService] Asynchronous email delivery failed to ${email.to}`, err);
      });
    }

    // 5. Dispatch SMS asynchronously if provided
    if (sms && sms.to) {
      SmsService.sendSms(sms.to, sms.message).catch((err) => {
        logger.error(`[NotificationService] Asynchronous SMS delivery failed`, err);
      });
    }

    return createdNotification;
  }

  /**
   * Broadcast notification to all users of a specific role, or all active users
   */
  static async broadcast(options: {
    title: string;
    message: string;
    type?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
    category?: 'EMERGENCY' | 'MATCH' | 'DONATION' | 'INVENTORY' | 'SYSTEM' | 'ACCOUNT';
    link?: string;
    actionUrl?: string;
    targetRole?: string;
  }) {
    try {
      const users = await prisma.user.findMany({
        where: options.targetRole ? { role: options.targetRole, isActive: true } : { isActive: true },
        select: { id: true },
        take: 200,
      });

      for (const u of users) {
        NotificationService.notify({
          userId: u.id,
          title: options.title,
          message: options.message,
          type: options.type || 'SYSTEM_NOTICE',
          priority: options.priority || 'NORMAL',
          category: options.category || 'EMERGENCY',
          link: options.link,
          actionUrl: options.actionUrl,
        }).catch(() => {});
      }
    } catch (err) {
      logger.error('[NotificationService] Broadcast error:', err);
    }
  }
}