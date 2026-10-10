import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  LayoutDashboard,
  Search,
  Bell,
  User,
  Menu,
  AlertCircle,
  Package,
  Heart,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMore: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMore }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  if (!user) return null;

  const role = user.role;

  const getNavItems = () => {
    switch (role) {
      case 'DONOR':
        return [
          { label: t('home'), path: '/donor/dashboard', icon: LayoutDashboard },
          { label: t('requests'), path: '/donor/requests', icon: AlertCircle },
          { label: t('alerts'), path: '/notifications', icon: Bell, badge: unreadCount },
          { label: t('profile'), path: '/donor/profile', icon: User },
        ];
      case 'PATIENT':
      case 'ATTENDANT':
        return [
          { label: t('home'), path: '/patient/dashboard', icon: LayoutDashboard },
          { label: t('findBlood'), path: '/find-blood', icon: Search },
          { label: t('needBloodNow'), path: '/patient/create-request', icon: AlertCircle },
          { label: t('alerts'), path: '/notifications', icon: Bell, badge: unreadCount },
        ];
      case 'HOSPITAL':
        return [
          { label: t('home'), path: '/hospital/dashboard', icon: LayoutDashboard },
          { label: t('requests'), path: '/hospital/requests', icon: AlertCircle },
          { label: t('confirm'), path: '/hospital/confirm-donation', icon: Heart },
          { label: t('alerts'), path: '/notifications', icon: Bell, badge: unreadCount },
        ];
      case 'BLOOD_BANK':
        return [
          { label: t('home'), path: '/bloodbank/dashboard', icon: LayoutDashboard },
          { label: t('inventoryOverview'), path: '/bloodbank/inventory', icon: Package },
          { label: t('aiCopilot'), path: '/bloodbank/copilot', icon: Search },
          { label: t('alerts'), path: '/notifications', icon: Bell, badge: unreadCount },
        ];
      case 'VOLUNTEER':
        return [
          { label: t('home'), path: '/volunteer/dashboard', icon: LayoutDashboard },
          { label: t('findBlood'), path: '/find-blood', icon: Search },
          { label: t('alerts'), path: '/notifications', icon: Bell, badge: unreadCount },
        ];
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return [
          { label: t('home'), path: '/admin/dashboard', icon: LayoutDashboard },
          { label: t('operations'), path: '/admin/command-center', icon: ShieldAlert },
          { label: t('verifications'), path: '/admin/verifications', icon: ClipboardList },
          { label: t('alerts'), path: '/notifications', icon: Bell, badge: unreadCount },
        ];
      default:
        return [
          { label: t('home'), path: '/', icon: LayoutDashboard },
          { label: t('findBlood'), path: '/find-blood', icon: Search },
          { label: t('alerts'), path: '/notifications', icon: Bell, badge: unreadCount },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 shadow-lg select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 h-14 items-center">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center h-full transition-colors relative touch-target ${
                isActive ? 'text-rose-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* 5th item is always 'More' trigger */}
        <button
          type="button"
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center h-full text-slate-500 hover:text-slate-800 transition-colors touch-target cursor-pointer"
          aria-label={t('more')}
        >
          <Menu className="w-5 h-5 stroke-2" />
          <span className="text-[10px] mt-0.5 tracking-tight">{t('more')}</span>
        </button>
      </div>
    </nav>
  );
};
