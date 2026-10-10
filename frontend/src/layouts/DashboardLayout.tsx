import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';
import {
  Droplets,
  Heart,
  LayoutDashboard,
  User,
  History,
  FilePlus,
  AlertCircle,
  Package,
  Users,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Compass,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Bell,
  Search,
  Settings,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { NotificationDropdown } from '../components/notifications/NotificationDropdown';
import { AiChatWidget } from '../components/AiChatWidget';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getAdminNavSections = () => [
    {
      heading: t('overview'),
      items: [
        { label: t('commandCenter'), path: '/admin/dashboard', icon: LayoutDashboard },
        { label: t('emergencySimulator'), path: '/admin/simulator', icon: Compass },
      ],
    },
    {
      heading: t('operations'),
      items: [
        { label: t('liveEmergencyOperations'), path: '/admin/command-center', icon: ShieldAlert },
        { label: t('verifications'), path: '/admin/verifications', icon: ShieldCheck },
        { label: t('campaigns'), path: '/admin/camps', icon: Heart },
      ],
    },
    {
      heading: t('userManagement'),
      items: [
        { label: t('userDirectory'), path: '/admin/users', icon: Users },
      ],
    },
  ];

  const getRoleLinks = () => {
    const role = user?.role;
    switch (role) {
      case 'DONOR':
        return [
          { label: t('overview'), path: '/donor/dashboard', icon: LayoutDashboard },
          { label: t('emergencyRequests'), path: '/donor/requests', icon: AlertCircle },
          { label: t('donationHistory'), path: '/donor/history', icon: History },
          { label: t('profile'), path: '/donor/profile', icon: User },
        ];
      case 'PATIENT':
      case 'ATTENDANT':
        return [
          { label: t('overview'), path: '/patient/dashboard', icon: LayoutDashboard },
          { label: t('findBlood'), path: '/find-blood', icon: Search },
          { label: t('createEmergencyRequest'), path: '/patient/create-request', icon: FilePlus },
        ];
      case 'HOSPITAL':
        return [
          { label: t('overview'), path: '/hospital/dashboard', icon: LayoutDashboard },
          { label: t('manageRequests'), path: '/hospital/requests', icon: AlertCircle },
          { label: t('confirmDonations'), path: '/hospital/confirm-donation', icon: Heart },
        ];
      case 'BLOOD_BANK':
        return [
          { label: t('overview'), path: '/bloodbank/dashboard', icon: LayoutDashboard },
          { label: t('manageInventory'), path: '/bloodbank/inventory', icon: Package },
          { label: t('aiCopilot'), path: '/bloodbank/copilot', icon: Sparkles },
        ];
      case 'VOLUNTEER':
        return [
          { label: t('overview'), path: '/volunteer/dashboard', icon: LayoutDashboard },
          { label: t('findBlood'), path: '/find-blood', icon: Search },
        ];
      default:
        return [{ label: t('home'), path: '/', icon: LayoutDashboard }];
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-100 flex overflow-x-hidden">
      {/* ============================================================ */}
      {/* 1. DESKTOP SIDEBAR (>= 1200px) */}
      {/* ============================================================ */}
      <aside className="hidden xl:flex xl:flex-col xl:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
        {/* Brand Logo Header - strictly links to / without logging out */}
        <Link
          to="/"
          title="Return to RakthaSethu Public Website"
          className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800 hover:bg-slate-800/50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-900 group-hover:scale-105 transition-transform">
            <Droplets className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <span className="text-base font-black text-white tracking-tight">RakthaSethu</span>
            <span className="block text-[10px] text-rose-400 uppercase font-semibold">
              {user?.role} Portal
            </span>
          </div>
        </Link>

        {/* User Card */}
        <div className="p-3 mx-3 my-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-xs shrink-0">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.displayName || user?.email}</p>
              <span className="inline-block text-[9px] uppercase font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded mt-0.5">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 space-y-3 overflow-y-auto">
          {isAdmin ? (
            getAdminNavSections().map((sec) => (
              <div key={sec.heading} className="space-y-1">
                <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {sec.heading}
                </span>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-rose-600 text-white shadow-sm shadow-rose-900'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="space-y-1">
              {getRoleLinks().map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-900'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Bottom links: Go to Website & Sign Out */}
        <div className="p-3 border-t border-slate-800 space-y-1.5 shrink-0">
          <Link
            to="/"
            title="Return to main public website"
            className="flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/50"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
              {t('goToWebsite')}
            </span>
            <span className="text-[10px] text-slate-400">/</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            {t('signOut')}
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. TABLET COMPACT SIDEBAR (768px – 1199px) */}
      {/* ============================================================ */}
      <aside className="hidden md:flex xl:hidden flex-col w-16 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 items-center py-3">
        {/* Logo */}
        <Link
          to="/"
          title="Return to RakthaSethu Public Website"
          className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-900 mb-4 hover:scale-105 transition-transform"
        >
          <Droplets className="w-5 h-5 fill-white text-white" />
        </Link>

        {/* Navigation Icons with Tooltips */}
        <nav className="flex-1 space-y-2 overflow-y-auto w-full px-2 flex flex-col items-center">
          {isAdmin ? (
            getAdminNavSections().flatMap((s) => s.items).map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative group ${
                    active ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })
          ) : (
            getRoleLinks().map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative group ${
                    active ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })
          )}
        </nav>

        {/* Tablet Footer Actions */}
        <div className="space-y-2 w-full px-2 flex flex-col items-center pt-2 border-t border-slate-800">
          <Link
            to="/"
            title={t('goToWebsite')}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ExternalLink className="w-4 h-4 text-rose-400" />
          </Link>
          <button
            onClick={handleLogout}
            title={t('signOut')}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-950/40 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 3. MAIN CONTENT WRAPPER */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-2.5">
            {/* Mobile Drawer Trigger [☰] */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 touch-target flex items-center justify-center cursor-pointer"
              aria-label={t('menu')}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile Brand Link */}
            <Link to="/" className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                <Droplets className="w-4 h-4 fill-white text-white" />
              </div>
              <span className="font-black text-slate-900 text-sm tracking-tight">RakthaSethu</span>
            </Link>

            {/* Desktop / Tablet Dashboard Title */}
            <h1 className="hidden md:block text-base lg:text-lg font-bold text-slate-900 truncate">
              {isAdmin
                ? t('adminDashboardTitle')
                : user?.role === 'DONOR'
                ? t('donorDashboardTitle')
                : user?.role === 'HOSPITAL'
                ? t('hospitalDashboardTitle')
                : user?.role === 'BLOOD_BANK'
                ? t('bloodBankDashboardTitle')
                : t('patientDashboardTitle')}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Go to Website */}
            <Link
              to="/"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title={t('goToWebsite')}
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              {t('goToWebsite')}
            </Link>

            {/* Language Selector (English / हिन्दी / తెలుగు) */}
            <LanguageSelector variant="header" />

            {/* Real-time Notifications Bell */}
            <NotificationDropdown />
          </div>
        </header>

        {/* Page body with bottom nav padding on mobile */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 pb-bottom-nav md:pb-6 overflow-y-auto">
          <Outlet />
        </main>

        {/* Global Floating AI Assistant (above mobile bottom nav) */}
        <AiChatWidget />

        {/* Mobile Bottom Navigation (0–767px) */}
        <MobileBottomNav onOpenMore={() => setDrawerOpen(true)} />
      </div>

      {/* ============================================================ */}
      {/* 4. MOBILE SLIDE-OUT DRAWER */}
      {/* ============================================================ */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative w-80 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col p-4 shadow-2xl z-10">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <Link
                to="/"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                  <Droplets className="w-5 h-5 fill-white text-white" />
                </div>
                <div>
                  <span className="text-base font-black text-white tracking-tight">RakthaSethu</span>
                  <span className="block text-[10px] text-rose-400 uppercase font-semibold">
                    {user?.role} Portal
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 touch-target flex items-center justify-center"
                aria-label={t('close')}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* User Info Card */}
            <div className="p-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-600/30 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.displayName || user?.email}</p>
                <span className="text-[10px] text-slate-400">{user?.role}</span>
              </div>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="flex-1 space-y-1 overflow-y-auto py-2">
              <Link
                to="/"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <span>{t('home')}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </Link>

              {isAdmin ? (
                getAdminNavSections().map((sec) => (
                  <div key={sec.heading} className="pt-2">
                    <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {sec.heading}
                    </span>
                    {sec.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <span>{item.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </Link>
                    ))}
                  </div>
                ))
              ) : (
                getRoleLinks().map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </Link>
                ))
              )}

              <div className="pt-3 border-t border-slate-800/80">
                <Link
                  to="/notifications"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <span>{t('notifications')}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </Link>
                {user?.role === 'DONOR' && (
                  <Link
                    to="/donor/profile"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <span>{t('profile')}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </Link>
                )}
              </div>
            </nav>

            {/* Drawer Footer with Language & Actions */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5 shrink-0">
              <LanguageSelector variant="drawer" />

              <Link
                to="/"
                onClick={() => setDrawerOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
                {t('goToWebsite')}
              </Link>

              <button
                onClick={() => {
                  handleLogout();
                  setDrawerOpen(false);
                }}
                className="w-full py-2.5 px-3 text-rose-400 hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
              >
                {t('signOut')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
