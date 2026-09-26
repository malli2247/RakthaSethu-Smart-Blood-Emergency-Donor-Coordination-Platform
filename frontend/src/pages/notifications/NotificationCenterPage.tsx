import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Search,
  Settings,
  Filter,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationItem } from '../../types';

export const NotificationCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'critical' | 'requests' | 'donations' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<string>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const {
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
    playChime,
    requestBrowserPermission,
    updatePreferences,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications(activeTab);
  }, [activeTab, fetchNotifications]);

  const handleBrowserPermRequest = async () => {
    const granted = await requestBrowserPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    const destination = notif.actionUrl || notif.link;
    if (destination) {
      navigate(destination);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return n.title.toLowerCase().includes(term) || n.message.toLowerCase().includes(term);
  });

  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-600 text-white font-black',
          border: 'border-l-4 border-l-rose-600 bg-rose-50/40',
        };
      case 'URGENT':
        return {
          badge: 'bg-amber-500 text-white font-bold',
          border: 'border-l-4 border-l-amber-500 bg-amber-50/20',
        };
      case 'HIGH':
        return {
          badge: 'bg-purple-100 text-purple-700 font-bold',
          border: 'border-l-4 border-l-purple-500',
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-600',
          border: 'border-l-4 border-l-slate-300',
        };
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/30 text-rose-400 text-xs font-bold uppercase border border-rose-500/30">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
            {isConnected ? 'Real-Time Lifeline Connected' : 'Connecting to emergency stream...'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Emergency Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Manage your blood request dispatches, compatibility matches, and audio alert channels.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <span>Mark All Read ({unreadCount})</span>
            </button>
          )}

          <button
            onClick={clearRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
            <span>Clear Read</span>
          </button>
        </div>
      </div>

      {/* Preferences & Quick Controls Box */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Sliders className="w-4 h-4 text-rose-600" />
            <span>Emergency Alert Preferences</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Auto-saved to device</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Sound Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Sound Alert Chime</span>
              <span className="text-[11px] text-slate-500">Play hospital tone on urgent alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => playChime('CRITICAL')}
                title="Test emergency chime"
                className="p-1.5 text-slate-500 hover:text-slate-800 bg-white rounded-lg border border-slate-200 text-[10px] font-bold"
              >
                Test
              </button>
              <button
                onClick={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
                className={`p-2 rounded-xl transition-colors ${
                  preferences.soundEnabled ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Browser Desktop Push */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Desktop Notifications</span>
              <span className="text-[11px] text-slate-500">
                {permissionStatus === 'granted'
                  ? 'Permission active'
                  : permissionStatus === 'denied'
                  ? 'Blocked in browser'
                  : 'Receive background alerts'}
              </span>
            </div>
            {permissionStatus === 'granted' ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            ) : (
              <button
                onClick={handleBrowserPermRequest}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Enable
              </button>
            )}
          </div>

          {/* High Urgency Filter */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Critical Only Filter</span>
              <span className="text-[11px] text-slate-500">Mute non-urgent system notices</span>
            </div>
            <button
              onClick={() => updatePreferences({ criticalOnly: !preferences.criticalOnly })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                preferences.criticalOnly
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-700'
              }`}
            >
              {preferences.criticalOnly ? 'Enabled' : 'Off'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-2xl overflow-x-auto">
          {[
            { id: 'all', label: 'All Alerts' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'critical', label: `Critical (${criticalCount})` },
            { id: 'requests', label: 'Blood Requests' },
            { id: 'donations', label: 'Donations' },
            { id: 'system', label: 'System' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-rose-500"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-rose-500" />
            <p className="text-xs">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No notifications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm
                ? 'Try adjusting your search terms.'
                : 'When emergency requests or matches matching your role occur, they will stream here.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const style = getPriorityStyle(notif.priority);

            return (
              <div
                key={notif.id}
                className={`p-5 transition-colors relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 ${
                  style.border
                } ${!notif.isRead ? 'bg-white' : 'bg-slate-50/30 opacity-80'}`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    {notif.priority && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider ${style.badge}`}>
                        {notif.priority}
                      </span>
                    )}
                    {notif.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold uppercase">
                        {notif.category}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" title="Unread" />
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">{notif.message}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {(notif.actionUrl || notif.link) && (
                    <button
                      onClick={() => handleItemClick(notif)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      <span>Take Action</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {!notif.isRead && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      title="Mark as read"
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => deleteNotification(notif.id)}
                    title="Delete notification"
                    className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
