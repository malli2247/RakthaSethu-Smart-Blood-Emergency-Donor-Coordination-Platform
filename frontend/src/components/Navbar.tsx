import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Heart,
  Droplets,
  AlertCircle,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Search,
  ChevronRight,
} from 'lucide-react';
import { NotificationDropdown } from './notifications/NotificationDropdown';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'DONOR':
        return '/donor/dashboard';
      case 'PATIENT':
      case 'ATTENDANT':
        return '/patient/dashboard';
      case 'HOSPITAL':
        return '/hospital/dashboard';
      case 'BLOOD_BANK':
        return '/bloodbank/dashboard';
      case 'VOLUNTEER':
        return '/volunteer/dashboard';
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Logo - clicks through to public homepage */}
          <Link
            to="/"
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded-xl"
          >
            <div className="w-8 h-8 sm:w-9 sm:w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-600 flex items-center justify-center text-white shadow-sm shadow-rose-200">
              <Droplets className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center">
                Raktha<span className="text-rose-600">Sethu</span>
              </span>
              <span className="hidden sm:block text-[9px] uppercase font-bold text-rose-600 tracking-wider -mt-1">
                {t('appTagline')}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link
              to="/find-blood"
              className={`hover:text-rose-600 transition-colors ${
                location.pathname === '/find-blood' ? 'text-rose-600 font-bold' : ''
              }`}
            >
              {t('findBlood')}
            </Link>
            <Link
              to="/compatibility"
              className={`hover:text-rose-600 transition-colors ${
                location.pathname === '/compatibility' ? 'text-rose-600 font-bold' : ''
              }`}
            >
              {t('compatibility')}
            </Link>
            <Link
              to="/campaigns"
              className={`hover:text-rose-600 transition-colors ${
                location.pathname === '/campaigns' ? 'text-rose-600 font-bold' : ''
              }`}
            >
              {t('campaigns')}
            </Link>
            <Link
              to="/how-it-works"
              className={`hover:text-rose-600 transition-colors ${
                location.pathname === '/how-it-works' ? 'text-rose-600 font-bold' : ''
              }`}
            >
              {t('howItWorks')}
            </Link>
            <Link
              to="/faq"
              className={`hover:text-rose-600 transition-colors ${
                location.pathname === '/faq' ? 'text-rose-600 font-bold' : ''
              }`}
            >
              {t('faq')}
            </Link>
          </nav>

          {/* Desktop Action CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <LanguageSelector variant="header" />

            <Link
              to="/patient/create-request"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {t('needBloodNow')}
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <Link
                  to={getDashboardPath()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-rose-600" />
                  {t('dashboard')}
                </Link>

                <NotificationDropdown />

                <button
                  onClick={handleLogout}
                  title={t('signOut')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <Link
                  to="/register?role=DONOR"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
                  {t('becomeDonor')}
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {t('signIn')}
                </Link>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* Mobile & Tablet Clean Header: [Logo] RakthaSethu [🔔] [☰] */}
          {/* ============================================================ */}
          <div className="flex lg:hidden items-center gap-2">
            {isAuthenticated && <NotificationDropdown />}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 touch-target flex items-center justify-center cursor-pointer"
              aria-label={t('menu')}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Mobile Drawer (Clean, Uncluttered, Task-Focused) */}
      {/* ============================================================ */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-150 shadow-lg">
          {isAuthenticated ? (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="overflow-hidden min-w-0 pr-2">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.displayName || user?.email}</p>
                <span className="inline-block text-[9px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded mt-0.5">
                  {user?.role}
                </span>
              </div>
              <Link
                to={getDashboardPath()}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-xl shrink-0"
              >
                {t('dashboard')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/patient/create-request"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {t('needBloodNow')}
              </Link>
              <Link
                to="/register?role=DONOR"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 flex items-center justify-center gap-1.5"
              >
                <Heart className="w-3.5 h-3.5 text-rose-600" />
                {t('becomeDonor')}
              </Link>
            </div>
          )}

          {/* Navigation links */}
          <nav className="space-y-1 divide-y divide-slate-100">
            <Link
              to="/find-blood"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2.5 text-xs font-medium text-slate-700 hover:text-rose-600"
            >
              <span>{t('findBlood')}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/compatibility"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2.5 text-xs font-medium text-slate-700 hover:text-rose-600"
            >
              <span>{t('compatibility')}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/campaigns"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2.5 text-xs font-medium text-slate-700 hover:text-rose-600"
            >
              <span>{t('campaigns')}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2.5 text-xs font-medium text-slate-700 hover:text-rose-600"
            >
              <span>{t('howItWorks')}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2.5 text-xs font-medium text-slate-700 hover:text-rose-600"
            >
              <span>{t('faq')}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </nav>

          {/* Drawer Footer with Language & Auth */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <LanguageSelector variant="segmented" className="w-full flex justify-center" />

            {!isAuthenticated ? (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center rounded-xl bg-slate-900 text-white font-bold text-xs block"
              >
                {t('signIn')}
              </Link>
            ) : (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-center rounded-xl border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 cursor-pointer"
              >
                {t('signOut')}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
