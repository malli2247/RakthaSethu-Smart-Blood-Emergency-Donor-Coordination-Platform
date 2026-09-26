import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Volume2,
  VolumeX,
  Radio,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationItem } from '../../types';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    criticalCount,
    isConnected,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
  } = useNotifications();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    const destination = notif.actionUrl || notif.link;
    if (destination) {
      navigate(destination);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-600 text-white font-black',
          border: 'border-l-4 border-l-rose-600 bg-rose-50/50',
          dot: 'bg-rose-600',
        };
      case 'URGENT':
        return {
          badge: 'bg-amber-500 text-white font-bold',
          border: 'border-l-4 border-l-amber-500 bg-amber-50/30',
          dot: 'bg-amber-500',
        };
      case 'HIGH':
        return {
          badge: 'bg-purple-100 text-purple-700 font-bold',
          border: 'border-l-4 border-l-purple-500',
          dot: 'bg-purple-500',
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-600',
          border: 'border-l-4 border-l-slate-300',
          dot: 'bg-slate-400',
        };
    }
  };

  const recentList = notifications.slice(0, 8);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        aria-label="Open notifications"
        className={`relative p-2 rounded-xl transition-all ${
          isOpen
            ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-500/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Bell className="w-5 h-5" />

        {/* Live SSE pulse indicator */}
        {isConnected && (
          <span
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"
            title="Real-time emergency feed connected"
          />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full flex items-center justify-center text-white shadow-sm ${
              criticalCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-rose-600'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">Emergency Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
                title={preferences.soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>

              {/* Mark all as read */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Connection Banner */}
          <div className="px-4 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isConnected ? 'Real-time Lifeline Active' : 'Connecting to live feed...'}
            </span>
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-rose-600 hover:text-rose-700 font-bold hover:underline"
            >
              Preferences
            </Link>
          </div>

          {/* Notifications Scroll Area */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {recentList.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">All caught up!</p>
                <p className="text-[11px] text-slate-400">
                  New emergency matches and platform updates will stream here in real time.
                </p>
              </div>
            ) : (
              recentList.map((notif) => {
                const style = getPriorityStyle(notif.priority);

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-colors relative group hover:bg-slate-50/80 ${
                      style.border
                    } ${!notif.isRead ? 'bg-white' : 'bg-slate-50/40 opacity-80'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 cursor-pointer" onClick={() => handleNotificationClick(notif)}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {notif.priority && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${style.badge}`}>
                              {notif.priority}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                          {!notif.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                          {notif.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {/* Item Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                        {!notif.isRead && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            title="Mark as read"
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          title="Dismiss"
                          className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {(notif.actionUrl || notif.link) && (
                      <div className="mt-2 flex items-center justify-end">
                        <button
                          onClick={() => handleNotificationClick(notif)}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                        >
                          <span>Open details</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1.5"
            >
              <span>View All Notifications & Preferences</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
