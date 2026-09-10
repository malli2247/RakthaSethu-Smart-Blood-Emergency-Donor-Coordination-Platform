import { prisma } from '../config/database';
import { EmailService } from './emailService';
import { SmsService } from './smsService';
import { logger } from '../utils/logger';

export interface DispatchNotificationOptions {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
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
   * Dispatches notifications across multiple channels in a non-blocking, resilient manner.
   */
  static async notify(options: DispatchNotificationOptions): Promise<void> {
    const { userId, title, message, type = 'SYSTEM_NOTICE', link, email, sms } = options;

    // 1. Create in-app notification in database
    try {
      await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type: type as any,
          link: link || null,
        },
      });
    } catch (dbErr) {
      logger.error(`[NotificationService] Database notification save failed for user ${userId}`, dbErr);
    }

    // 2. Dispatch Email asynchronously if provided
    if (email && email.to) {
      EmailService.sendMail({
        to: email.to,
        subject: email.subject,
        html: email.html,
      }).catch((err) => {
        logger.error(`[NotificationService] Asynchronous email delivery failed to ${email.to}`, err);
      });
    }

    // 3. Dispatch SMS asynchronously if provided
    if (sms && sms.to) {
      SmsService.sendSms(sms.to, sms.message).catch((err) => {
        logger.error(`[NotificationService] Asynchronous SMS delivery failed`, err);
      });
    }
  }
}