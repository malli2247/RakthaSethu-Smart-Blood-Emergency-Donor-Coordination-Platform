import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NotificationItem, NotificationPreferences } from '../types';
import { notificationApi, API_BASE_URL } from '../services/api';
import { pushNotificationService } from '../services/pushNotificationService';
import { offlineStorage } from '../services/offlineStorage';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  criticalCount: number;
  isLoading: boolean;
  isConnected: boolean;
  preferences: NotificationPreferences;
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  pushPermission: NotificationPermission;
  fetchNotifications: (filter?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearRead: () => Promise<void>;
  requestBrowserPermission: () => Promise<boolean>;
  subscribeToPush: () => Promise<{ success: boolean; error?: string }>;
  unsubscribeFromPush: () => Promise<{ success: boolean; error?: string }>;
  sendTestPushNotification: () => Promise<void>;
  playChime: (priority?: string) => void;
  updatePreferences: (newPrefs: Partial<NotificationPreferences>) => Promise<void>;
}

const DEFAULT_PREFS: NotificationPreferences = {
  inAppAlerts: true,
  soundEnabled: true,
  browserNotifications: false,
  criticalOnly: false,
  vibrationEnabled: true,
  emergencyAlerts: true,
  bloodRequests: true,
  donationUpdates: true,
  systemAlerts: true,
  campaignAlerts: true,
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Web Audio API Synthesizer for emergency chime (foreground tab alerts)
function playAudioChime(isCritical: boolean = false) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Two-tone pleasant notification chime (880Hz A5 -> 1174Hz D6)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(isCritical ? 880 : 587.33, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second harmonic tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(isCritical ? 1174.66 : 880, now + 0.15);
    gain2.gain.setValueAtTime(0.2, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch {
    // Blocked by browser autoplay policy until user gesture
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Web Push states
  const [isPushSupported] = useState<boolean>(() => pushNotificationService.isPushSupported());
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() =>
    pushNotificationService.getPermissionState()
  );

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem('rakthasethu_notification_prefs');
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // Check subscription status on mount and when auth changes
  useEffect(() => {
    if (isPushSupported) {
      pushNotificationService.getCurrentSubscription().then((sub) => {
        setIsPushSubscribed(Boolean(sub));
        setPushPermission(pushNotificationService.getPermissionState());
      });
    }

    if (isAuthenticated) {
      notificationApi
        .getPreferences()
        .then((res) => {
          if (res.data?.data) {
            const p = res.data.data;
            setPreferences((prev) => {
              const updated = {
                ...prev,
                soundEnabled: p.soundEnabled ?? prev.soundEnabled,
                browserNotifications: p.pushEnabled ?? prev.browserNotifications,
                vibrationEnabled: p.vibrationEnabled ?? prev.vibrationEnabled ?? true,
                emergencyAlerts: p.emergencyAlerts ?? true,
                bloodRequests: p.bloodRequests ?? true,
                donationUpdates: p.donationUpdates ?? true,
                systemAlerts: p.systemAlerts ?? true,
                campaignAlerts: p.campaignAlerts ?? true,
              };
              localStorage.setItem('rakthasethu_notification_prefs', JSON.stringify(updated));
              return updated;
            });
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, isPushSupported]);

  // Fetch notifications from REST API
  const fetchNotifications = useCallback(
    async (filter: string = 'all') => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        const res = await notificationApi.list({ filter, limit: 50 });
        if (res.data?.data) {
          setNotifications(res.data.data.notifications || []);
          setUnreadCount(res.data.data.unreadCount || 0);
          setCriticalCount(res.data.data.criticalCount || 0);
        }
      } catch (err) {
        console.error('[NotificationContext] Failed to fetch notifications:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated]
  );

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await notificationApi.markRead(id);
    } catch (err) {
      console.error('[NotificationContext] Error marking notification read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      setCriticalCount(0);
      await notificationApi.markRead('all');
    } catch (err) {
      console.error('[NotificationContext] Error marking all notifications read:', err);
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      await notificationApi.delete(id);
    } catch (err) {
      console.error('[NotificationContext] Error deleting notification:', err);
    }
  };

  // Clear all read notifications
  const clearRead = async () => {
    try {
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      await notificationApi.clearRead();
    } catch (err) {
      console.error('[NotificationContext] Error clearing read notifications:', err);
    }
  };

  // Play audio chime
  const playChime = (priority?: string) => {
    if (preferences.soundEnabled) {
      const isCritical = priority === 'CRITICAL' || priority === 'URGENT';
      playAudioChime(isCritical);
    }
  };

  // Request browser Web Notification permission
  const requestBrowserPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      const granted = permission === 'granted';
      updatePreferences({ browserNotifications: granted });
      return granted;
    } catch {
      return false;
    }
  };

  // Real Web Push subscription handler
  const subscribeToPush = async (): Promise<{ success: boolean; error?: string }> => {
    const result = await pushNotificationService.subscribeToPush();
    if (result.success) {
      setIsPushSubscribed(true);
      setPushPermission('granted');
      await updatePreferences({ browserNotifications: true });
    }
    return result;
  };

  // Real Web Push unsubscription handler
  const unsubscribeFromPush = async (): Promise<{ success: boolean; error?: string }> => {
    const result = await pushNotificationService.unsubscribeFromPush();
    if (result.success) {
      setIsPushSubscribed(false);
      await updatePreferences({ browserNotifications: false });
    }
    return result;
  };

  // Dispatch test push
  const sendTestPushNotification = async (): Promise<void> => {
    await notificationApi.sendTestPush();
    fetchNotifications();
  };

  // Update preferences and sync with backend
  const updatePreferences = async (newPrefs: Partial<NotificationPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('rakthasethu_notification_prefs', JSON.stringify(updated));
      return updated;
    });

    if (isAuthenticated) {
      try {
        await notificationApi.updatePreferences({
          pushEnabled: newPrefs.browserNotifications !== undefined ? newPrefs.browserNotifications : undefined,
          soundEnabled: newPrefs.soundEnabled,
          vibrationEnabled: newPrefs.vibrationEnabled,
          emergencyAlerts: newPrefs.emergencyAlerts,
          bloodRequests: newPrefs.bloodRequests,
          donationUpdates: newPrefs.donationUpdates,
          systemAlerts: newPrefs.systemAlerts,
          campaignAlerts: newPrefs.campaignAlerts,
        });
      } catch (err) {
        console.warn('[NotificationContext] Could not sync preferences to backend:', err);
      }
    }
  };

  // Setup Real-Time SSE Stream with auto-reconnect and offline recovery
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Initial fetch of unread count and latest alerts
    fetchNotifications();

    // Build SSE URL with auth token query param
    const streamUrl = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;

    let sse: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        sse = new EventSource(streamUrl);
        eventSourceRef.current = sse;

        sse.onopen = () => {
          setIsConnected(true);
        };

        // Listen for new real-time notification
        sse.addEventListener('notification', (e) => {
          try {
            const data = JSON.parse(e.data);
            const newNotif: NotificationItem = data.notification;
            const updatedUnread: number = data.unreadCount ?? 1;

            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });

            setUnreadCount(updatedUnread);

            if (newNotif.priority === 'CRITICAL' || newNotif.priority === 'URGENT') {
              setCriticalCount((c) => c + 1);
            }

            // Foreground Audio alert
            if (preferences.soundEnabled) {
              playAudioChime(newNotif.priority === 'CRITICAL');
            }

            // Foreground Vibration alert (if supported and enabled)
            if (preferences.vibrationEnabled !== false) {
              pushNotificationService.vibrate(newNotif.priority || 'NORMAL');
            }
          } catch (err) {
            console.error('[NotificationContext] Error parsing incoming SSE event:', err);
          }
        });

        // Listen for count updates from other tabs / actions
        sse.addEventListener('count_update', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.unreadCount !== undefined) setUnreadCount(data.unreadCount);
            if (data.criticalCount !== undefined) setCriticalCount(data.criticalCount);
          } catch {
            // ignore
          }
        });

        sse.onerror = () => {
          setIsConnected(false);
          if (sse) sse.close();
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        console.error('[NotificationContext] SSE Initialization error:', err);
      }
    };

    connectSSE();

    // Reconnect, recover missed notifications, and sync queued offline actions
    const handleOnline = async () => {
      console.log('[NotificationContext] Network re-established. Synchronizing offline queue and alerts...');
      try {
        await offlineStorage.syncAllPendingActions();
      } catch (syncErr) {
        console.error('[NotificationContext] Offline sync error:', syncErr);
      }
      fetchNotifications();
      connectSSE();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [
    isAuthenticated,
    token,
    fetchNotifications,
    preferences.soundEnabled,
    preferences.vibrationEnabled,
    preferences.browserNotifications,
  ]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        criticalCount,
        isLoading,
        isConnected,
        preferences,
        isPushSupported,
        isPushSubscribed,
        pushPermission,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearRead,
        requestBrowserPermission,
        subscribeToPush,
        unsubscribeFromPush,
        sendTestPushNotification,
        playChime,
        updatePreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
