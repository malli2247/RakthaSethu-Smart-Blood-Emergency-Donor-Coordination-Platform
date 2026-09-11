import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Heart,
  Droplets,
  AlertCircle,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Bell,
  Activity,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import { notificationApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (isAuthenticated) {
      notificationApi
        .list()
        .then((res) => {
          setUnreadCount(res.data?.data?.unreadCount || 0);
        })
        .catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

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
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-md shadow-rose-200">
              <Droplets className="w-6 h-6 fill-white text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1">
                Raktha<span className="text-rose-600">Sethu</span>
              </span>
              <span className="block text-[10px] uppercase font-bold text-rose-600 tracking-wider -mt-1">
                Emergency Blood Connect
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
              Find Blood
            </Link>
            <Link
              to="/compatibility"
              className={`hover:text-rose-600 transition-colors ${
                location.pathname === '/compatibility' ? 'text-rose-600 font-bold' : ''
              }`}
            >
              Compatibility Matrix
            </Link>
            <Link
              to="/campaigns"
              className={`hover:text-rose-600 transition-colors ${
                location.pathname === '/campaigns' ? 'text-rose-600 font-bold' : ''
              }`}
            >
              Donation Camps
            </Link>
            <Link
              to="/how-it-works"
              className={`hover:text-rose-600 transition-colors ${
                location.pathname === '/how-it-works' ? 'text-rose-600 font-bold' : ''
              }`}
            >
              How It Works
            </Link>
            <Link
              to="/faq"
              className={`hover:text-rose-600 transition-colors ${
                location.pathname === '/faq' ? 'text-rose-600 font-bold' : ''
              }`}
            >
              FAQ
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* Emergency Request Button */}
            <Link
              to="/patient/create-request"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 transition-colors"
            >
              <AlertCircle className="w-4 h-4 animate-bounce" />
              Need Blood?
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
                <Link
                  to={getDashboardPath()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                >
                  <Activity className="w-4 h-4 text-rose-600" />
                  Dashboard
                </Link>

                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-xs border border-rose-200">
                    {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <Link
                  to="/register?role=DONOR"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200"
                >
                  <Heart className="w-4 h-4 text-rose-600 fill-rose-500" />
                  Donate Blood
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/patient/create-request"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Need Blood
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/find-blood"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-rose-600"
          >
            Find Blood
          </Link>
          <Link
            to="/compatibility"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-rose-600"
          >
            Compatibility Matrix
          </Link>
          <Link
            to="/campaigns"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-rose-600"
          >
            Donation Camps
          </Link>
          <Link
            to="/how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-rose-600"
          >
            How It Works
          </Link>
          <Link
            to="/faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-rose-600"
          >
            FAQ
          </Link>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                setLanguage(language === 'en' ? 'hi' : 'en');
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 px-3 text-center rounded-lg border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4 text-slate-500" />
              <span>Switch Language: {language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>
            {isAuthenticated ? (
              <>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-4 text-center rounded-lg bg-slate-900 text-white font-semibold text-sm"
                >
                  My Dashboard ({user?.role})
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-4 text-center rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/register?role=DONOR"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-4 text-center rounded-lg bg-rose-600 text-white font-semibold text-sm"
                >
                  Become a Blood Donor
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 px-4 text-center rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
