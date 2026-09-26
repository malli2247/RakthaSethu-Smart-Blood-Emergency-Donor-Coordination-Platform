import { notificationApi } from './api';

// Helper to convert base64 URL safe VAPID key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushNotificationService = {
  /**
   * Detects if the current browser and environment support Web Push notifications
   */
  isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  /**
   * Detects if Vibration API is available on the device
   */
  isVibrationSupported(): boolean {
    return typeof window !== 'undefined' && 'vibrate' in navigator;
  },

  /**
   * Returns current browser Notification permission
   */
  getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  },

  /**
   * Gets the active PushSubscription if already subscribed
   */
  async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch {
      return null;
    }
  },

  /**
   * Registers the service worker and subscribes the user to Web Push
   */
  async subscribeToPush(): Promise<{ success: boolean; error?: string }> {
    if (!this.isPushSupported()) {
      return {
        success: false,
        error: 'Push notifications are not supported on this browser/device.',
      };
    }

    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        return {
          success: false,
          error: 'Notifications are blocked. Enable notifications in your browser/device settings.',
        };
      }
      if (permission !== 'granted') {
        return {
          success: false,
          error: 'Notification permission was not granted.',
        };
      }

      // 2. Ensure Service Worker is registered
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const registration = await navigator.serviceWorker.ready;

      // 3. Obtain VAPID Public Key from backend or fallback to environment variable
      let vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      try {
        const vapidRes = await notificationApi.getVapidPublicKey();
        if (vapidRes.data?.data?.publicKey) {
          vapidPublicKey = vapidRes.data.data.publicKey;
        } else if (vapidRes.data?.data?.vapidPublicKey) {
          vapidPublicKey = vapidRes.data.data.vapidPublicKey;
        } else if (vapidRes.data?.publicKey) {
          vapidPublicKey = vapidRes.data.publicKey;
        } else if (vapidRes.data?.vapidPublicKey) {
          vapidPublicKey = vapidRes.data.vapidPublicKey;
        }
      } catch (keyErr) {
        console.warn('[PushService] Could not fetch remote VAPID key, using fallback.', keyErr);
      }

      if (!vapidPublicKey) {
        vapidPublicKey = 'BD3wUSOHMziCiqA6EoULEnRcC7ouASGCDyyQ_0L7HSImy-ByJqC9ooZsVGGyUnBMPwig_hf5I0FOMtD5IGhtpxA';
      }

      // 4. Subscribe with PushManager
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as BufferSource,
        });
      }

      // 5. Send subscription securely to backend
      const subJson = subscription.toJSON();
      if (!subJson.keys?.p256dh || !subJson.keys?.auth) {
        return {
          success: false,
          error: 'Browser failed to generate push authentication keys.',
        };
      }

      const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
        ? 'MOBILE'
        : 'DESKTOP';

      await notificationApi.registerPushSubscription({
        endpoint: subscription.endpoint,
        keys: subJson.keys,
        userAgent: navigator.userAgent,
        deviceType,
      });

      return { success: true };
    } catch (err: any) {
      console.error('[PushService] Failed to subscribe to Web Push:', err);
      return {
        success: false,
        error: err.message || 'Push subscription could not be completed.',
      };
    }
  },

  /**
   * Unsubscribes the current device from Web Push
   */
  async unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
    if (!this.isPushSupported()) {
      return { success: true };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Inform backend
        try {
          await notificationApi.revokePushSubscription({ endpoint: subscription.endpoint });
        } catch (apiErr) {
          console.warn('[PushService] Error reporting unsubscription to backend:', apiErr);
        }

        // Unsubscribe from browser push manager
        await subscription.unsubscribe();
      }

      return { success: true };
    } catch (err: any) {
      console.error('[PushService] Failed to unsubscribe:', err);
      return {
        success: false,
        error: err.message || 'Failed to remove push subscription',
      };
    }
  },

  /**
   * Triggers device vibration based on emergency priority
   */
  vibrate(priority: string = 'NORMAL'): void {
    if (!this.isVibrationSupported()) return;

    try {
      if (priority === 'CRITICAL') {
        navigator.vibrate([500, 150, 500, 150, 800]);
      } else if (priority === 'URGENT') {
        navigator.vibrate([400, 150, 400, 150, 600]);
      } else if (priority === 'HIGH') {
        navigator.vibrate([200, 100, 200]);
      } else {
        navigator.vibrate([200]);
      }
    } catch {
      // Ignored if device blocks programmatic vibration
    }
  },
};
