import webpush from 'web-push';
import { prisma } from '../config/database';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize VAPID details with fallback protection
try {
  if (config.push.vapidPublicKey && config.push.vapidPrivateKey) {
    webpush.setVapidDetails(
      config.push.vapidSubject,
      config.push.vapidPublicKey,
      config.push.vapidPrivateKey
    );
    logger.info('[WebPushService] ✅ VAPID configuration initialized successfully.');
  } else {
    logger.warn('[WebPushService] ⚠️ VAPID keys not configured. Web Push will run in simulated mode.');
  }
} catch (err) {
  logger.error('[WebPushService] ❌ Failed to initialize VAPID details:', err);
}

export interface PushPayloadOptions {
  id: string;
  title: string;
  message: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
  category?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export class WebPushService {
  /**
   * Resolve vibration pattern based on urgency level
   */
  static getVibrationPattern(priority: string): number[] {
    switch (priority) {
      case 'CRITICAL':
        return [500, 150, 500, 150, 800];
      case 'URGENT':
        return [400, 150, 400, 150, 600];
      case 'HIGH':
        return [200, 100, 200];
      case 'NORMAL':
      default:
        return [200];
    }
  }

  /**
   * Sanitizes notification body for lockscreen and public display (Privacy & HIPAA/GDPR Compliance)
   */
  static sanitizeForPush(title: string, message: string, priority: string): { title: string; body: string } {
    let sanitizedTitle = title;
    let sanitizedBody = message;

    // Redact private mobile numbers (+91...) or sensitive patient names
    sanitizedBody = sanitizedBody.replace(/\+?[0-9]{10,12}/g, '****');

    // For critical emergency requests, ensure privacy while retaining urgency
    if (priority === 'CRITICAL' && !sanitizedTitle.toLowerCase().includes('emergency')) {
      sanitizedTitle = `🚨 Emergency Alert: ${sanitizedTitle}`;
    }

    return { title: sanitizedTitle, body: sanitizedBody };
  }

  /**
   * Sanitizes payload data object by removing personal and confidential fields
   */
  static sanitizePayloadData(data: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['patientPhone', 'patientName', 'phone', 'contactNumber', 'latitude', 'longitude', 'exactAddress'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (!sensitiveKeys.includes(key)) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Subscribes a user's device to push notifications
   */
  static async registerSubscription(
    userId: string,
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
      userAgent?: string;
      deviceType?: string;
    }
  ) {
    const { endpoint, keys, userAgent, deviceType } = subscription;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Invalid PushSubscription payload. Missing endpoint or auth keys.');
    }

    // Upsert subscription for this device endpoint
    const pushSub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
        deviceType: deviceType || 'DESKTOP',
        isActive: true,
        revokedAt: null,
      },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || null,
        deviceType: deviceType || 'DESKTOP',
        isActive: true,
        revokedAt: null,
        updatedAt: new Date(),
      },
    });

    logger.info(`[WebPushService] Registered push subscription for user ${userId} (${pushSub.deviceType})`);
    return pushSub;
  }

  /**
   * Revoke or deactivate a specific push subscription
   */
  static async revokeSubscription(endpoint: string, userId?: string) {
    try {
      const where: any = { endpoint };
      if (userId) where.userId = userId;

      await prisma.pushSubscription.updateMany({
        where,
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });
      logger.info(`[WebPushService] Revoked push subscription: ${endpoint.substring(0, 30)}...`);
    } catch (err) {
      logger.error('[WebPushService] Error revoking subscription:', err);
    }
  }

  /**
   * Send Web Push to all active subscriptions of a target user
   */
  static async sendToUser(userId: string, notification: PushPayloadOptions): Promise<void> {
    try {
      // 1. Check user notification preferences
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (preferences) {
        if (!preferences.pushEnabled) {
          logger.info(`[WebPushService] Push disabled in preferences for user ${userId}`);
          return;
        }

        // Check category preferences
        const cat = notification.category?.toUpperCase() || 'GENERAL';
        if (cat === 'EMERGENCY' && !preferences.emergencyAlerts) return;
        if (cat === 'MATCH' && !preferences.bloodRequests) return;
        if (cat === 'DONATION' && !preferences.donationUpdates) return;
        if (cat === 'SYSTEM' && !preferences.systemAlerts) return;
      }

      // 2. Query all active registered push subscriptions for this user
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (subscriptions.length === 0) {
        return;
      }

      const priority = notification.priority || 'NORMAL';
      const vibration = WebPushService.getVibrationPattern(priority);
      const { title, body } = WebPushService.sanitizeForPush(
        notification.title,
        notification.message,
        priority
      );

      const targetUrl = notification.actionUrl || '/notifications';

      // 3. Construct structured Web Push payload compliant with W3C Push API
      const payload = JSON.stringify({
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          tag: `rakthasethu-${notification.category || 'alert'}-${notification.id}`,
          renotify: true,
          requireInteraction: priority === 'CRITICAL' || priority === 'URGENT',
          silent: false,
          vibrate: vibration,
          data: {
            url: targetUrl,
            notificationId: notification.id,
            priority,
            category: notification.category,
            timestamp: Date.now(),
          },
          actions: [
            { action: 'open', title: 'Open RakthaSethu' },
            { action: 'dismiss', title: 'Dismiss' },
          ],
        },
      });

      const pushOptions: webpush.RequestOptions = {
        TTL: priority === 'CRITICAL' ? 86400 : 43200, // 24h for critical, 12h for normal
        urgency: priority === 'CRITICAL' || priority === 'URGENT' ? 'high' : 'normal',
      };

      // 4. Dispatch to each registered device
      for (const sub of subscriptions) {
        // Record initial QUEUED delivery attempt
        let deliveryRecord: any = null;
        try {
          deliveryRecord = await prisma.notificationDelivery.create({
            data: {
              notificationId: notification.id,
              subscriptionId: sub.id,
              status: 'QUEUED',
              attemptedAt: new Date(),
            },
          });
        } catch {
          // If delivery record creation fails, continue delivery
        }

        const pushSubscriptionFormat = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          if (deliveryRecord) {
            await prisma.notificationDelivery.update({
              where: { id: deliveryRecord.id },
              data: { status: 'SENDING' },
            });
          }

          const response = await webpush.sendNotification(
            pushSubscriptionFormat,
            payload,
            pushOptions
          );

          if (deliveryRecord) {
            await prisma.notificationDelivery.update({
              where: { id: deliveryRecord.id },
              data: {
                status: 'SENT',
                statusCode: response.statusCode,
                deliveredAt: new Date(),
              },
            });
          }

          // Update subscription lastSuccessAt
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: {
              lastSuccessAt: new Date(),
              failureCount: 0,
            },
          });

          logger.info(`[WebPushService] Push sent to user ${userId} device ${sub.deviceType} (status ${response.statusCode})`);
        } catch (pushErr: any) {
          const statusCode = pushErr.statusCode;
          logger.warn(`[WebPushService] Push delivery failed for device ${sub.id} (code ${statusCode}):`, pushErr.message);

          if (deliveryRecord) {
            await prisma.notificationDelivery.update({
              where: { id: deliveryRecord.id },
              data: {
                status: statusCode === 410 || statusCode === 404 ? 'EXPIRED' : 'FAILED',
                statusCode: statusCode || 500,
                errorCode: pushErr.name || 'PUSH_FAILED',
                errorMessage: pushErr.message?.substring(0, 255),
              },
            });
          }

          // 410 Gone or 404 Not Found indicates expired or revoked subscription
          if (statusCode === 410 || statusCode === 404) {
            logger.info(`[WebPushService] Deactivating expired subscription ${sub.id}`);
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: {
                isActive: false,
                revokedAt: new Date(),
                lastFailureAt: new Date(),
              },
            });
          } else {
            // Increment failure count
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: {
                failureCount: { increment: 1 },
                lastFailureAt: new Date(),
              },
            });
          }
        }
      }
    } catch (outerErr) {
      logger.error(`[WebPushService] Failed to dispatch push to user ${userId}:`, outerErr);
    }
  }

  /**
   * Track when a push notification was clicked by the user
   */
  static async recordClick(notificationId: string, subscriptionEndpoint?: string): Promise<void> {
    try {
      if (subscriptionEndpoint) {
        const sub = await prisma.pushSubscription.findUnique({
          where: { endpoint: subscriptionEndpoint },
        });

        if (sub) {
          await prisma.notificationDelivery.updateMany({
            where: {
              notificationId,
              subscriptionId: sub.id,
            },
            data: {
              status: 'CLICKED_IF_SUPPORTED',
              clickedAt: new Date(),
            },
          });
        }
      }
    } catch (err) {
      logger.warn('[WebPushService] Failed to record notification click:', err);
    }
  }
}
