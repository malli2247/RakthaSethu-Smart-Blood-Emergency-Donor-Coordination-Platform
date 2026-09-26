import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NotificationItem, NotificationPreferences } from '../types';
import { notificationApi, API_BASE_URL } from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  criticalCount: number;
  isLoading: boolean;
  isConnected: boolean;
  preferences: NotificationPreferences;
  fetchNotifications: (filter?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearRead: () => Promise<void>;
  requestBrowserPermission: () => Promise<boolean>;
  playChime: (priority?: string) => void;
  updatePreferences: (newPrefs: Partial<NotificationPreferences>) => void;
}

const DEFAULT_PREFS: NotificationPreferences = {
  inAppAlerts: true,
  soundEnabled: true,
  browserNotifications: false,
  criticalOnly: false,
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Web Audio API Synthesizer for emergency chime
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
    osc1.frequency.setValueAtTime(isCritical ? 880 : 587.33, now); // Higher pitch for critical
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone
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
    // AudioContext blocked by browser autoplay policy until user gesture
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem('rakthasethu_notification_prefs');
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const eventSourceRef = useRef<EventSource | null>(null);

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
      const granted = permission === 'granted';
      updatePreferences({ browserNotifications: granted });
      return granted;
    } catch {
      return false;
    }
  };

  // Update preferences
  const updatePreferences = (newPrefs: Partial<NotificationPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('rakthasethu_notification_prefs', JSON.stringify(updated));
      return updated;
    });
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
              // Avoid duplicate if already in state
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });

            setUnreadCount(updatedUnread);

            if (newNotif.priority === 'CRITICAL' || newNotif.priority === 'URGENT') {
              setCriticalCount((c) => c + 1);
            }

            // Audio alert
            if (preferences.soundEnabled) {
              playAudioChime(newNotif.priority === 'CRITICAL');
            }

            // Browser desktop push notification if backgrounded
            if (
              preferences.browserNotifications &&
              'Notification' in window &&
              Notification.permission === 'granted' &&
              document.visibilityState === 'hidden'
            ) {
              try {
                new Notification(newNotif.title, {
                  body: newNotif.message,
                  icon: '/icon-192.png',
                  tag: newNotif.id,
                });
              } catch {
                // Ignore desktop notification failure
              }
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
          // Auto-reconnect after 4 seconds
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        console.error('[NotificationContext] SSE Initialization error:', err);
      }
    };

    connectSSE();

    // Reconnect and recover missed notifications when network comes back online
    const handleOnline = () => {
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
  }, [isAuthenticated, token, fetchNotifications, preferences.soundEnabled, preferences.browserNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        criticalCount,
        isLoading,
        isConnected,
        preferences,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearRead,
        requestBrowserPermission,
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
