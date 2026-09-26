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
  Activity,
  Globe,
  LayoutDashboard,
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo - clicks through to public homepage */}
          <Link to="/" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded-xl p-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-md shadow-rose-200">
              <Droplets className="w-6 h-6 fill-white text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1">
                Raktha<span className="text-rose-600">Sethu</span>
              </span>
              <span className="block text-[10px] uppercase font-bold text-rose-600 tracking-wider -mt-1">
                {t('appTagline')}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
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

          {/* Action CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Universal 11 Indian Languages Dropdown */}
            <LanguageSelector variant="header" />

            {/* Emergency Request Button */}
            <Link
              to="/patient/create-request"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 transition-colors"
            >
              <AlertCircle className="w-4 h-4 animate-bounce" />
              {t('needBloodNow')}
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
                <Link
                  to={getDashboardPath()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-rose-600" />
                  {t('dashboard')}
                </Link>

                <NotificationDropdown />

                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-xs border border-rose-200" title={user?.email}>
                    {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title={t('signOut')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <Link
                  to="/register?role=DONOR"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                >
                  <Heart className="w-4 h-4 text-rose-600 fill-rose-500" />
                  {t('becomeDonor')}
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {t('signIn')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle & quick CTA */}
          <div className="flex lg:hidden items-center gap-2">
            <LanguageSelector variant="header" />

            <Link
              to="/patient/create-request"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white flex items-center gap-1 shadow-sm"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('needBloodNow')}</span>
            </Link>

            {isAuthenticated && <NotificationDropdown />}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2">
          {isAuthenticated && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">{user?.displayName || user?.email}</p>
                <span className="inline-block text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  {user?.role}
                </span>
              </div>
              <Link
                to={getDashboardPath()}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-lg"
              >
                {t('dashboard')}
              </Link>
            </div>
          )}

          <nav className="space-y-1">
            <Link
              to="/find-blood"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-rose-600"
            >
              {t('findBlood')}
            </Link>
            <Link
              to="/compatibility"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-rose-600"
            >
              {t('compatibility')}
            </Link>
            <Link
              to="/campaigns"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-rose-600"
            >
              {t('campaigns')}
            </Link>
            <Link
              to="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-rose-600"
            >
              {t('howItWorks')}
            </Link>
            <Link
              to="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 hover:text-rose-600"
            >
              {t('faq')}
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <LanguageSelector variant="drawer" />

            {!isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  to="/register?role=DONOR"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center rounded-xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200"
                >
                  {t('becomeDonor')}
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  {t('signIn')}
                </Link>
              </div>
            ) : (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-center rounded-xl border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50"
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
