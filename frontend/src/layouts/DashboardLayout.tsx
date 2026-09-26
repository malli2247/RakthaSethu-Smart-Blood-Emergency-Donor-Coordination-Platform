import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';
import {
  Droplets,
  Heart,
  LayoutDashboard,
  User,
  History,
  FilePlus,
  AlertCircle,
  Building2,
  Package,
  Users,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Compass,
  Radio,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Globe,
  Activity,
  Layers,
  FileText,
  Server,
} from 'lucide-react';
import { NotificationDropdown } from '../components/notifications/NotificationDropdown';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getAdminNavSections = () => [
    {
      heading: 'OVERVIEW',
      items: [
        { label: 'Command Center', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Emergency Simulator', path: '/admin/simulator', icon: Compass },
      ],
    },
    {
      heading: 'OPERATIONS',
      items: [
        { label: 'Emergency Radar', path: '/admin/command-center', icon: ShieldAlert },
        { label: 'Facility Verifications', path: '/admin/verifications', icon: ShieldCheck },
      ],
    },
    {
      heading: 'GOVERNANCE',
      items: [
        { label: 'User Directory', path: '/admin/users', icon: Users },
      ],
    },
  ];

  const getRoleLinks = () => {
    const role = user?.role;
    switch (role) {
      case 'DONOR':
        return [
          { label: 'Overview', path: '/donor/dashboard', icon: LayoutDashboard },
          { label: 'Blood Requests', path: '/donor/requests', icon: AlertCircle },
          { label: 'Donation History', path: '/donor/history', icon: History },
          { label: 'My Donor Profile', path: '/donor/profile', icon: User },
        ];
      case 'PATIENT':
      case 'ATTENDANT':
        return [
          { label: 'My Requests', path: '/patient/dashboard', icon: LayoutDashboard },
          { label: 'Create Blood Request', path: '/patient/create-request', icon: FilePlus },
        ];
      case 'HOSPITAL':
        return [
          { label: 'Hospital Overview', path: '/hospital/dashboard', icon: LayoutDashboard },
          { label: 'Manage Requests', path: '/hospital/requests', icon: AlertCircle },
          { label: 'Confirm Donations', path: '/hospital/confirm-donation', icon: Heart },
        ];
      case 'BLOOD_BANK':
        return [
          { label: 'Inventory Overview', path: '/bloodbank/dashboard', icon: LayoutDashboard },
          { label: 'Manage Inventory', path: '/bloodbank/inventory', icon: Package },
          { label: 'AI Copilot', path: '/bloodbank/copilot', icon: Sparkles },
        ];
      case 'VOLUNTEER':
        return [
          { label: 'Volunteer Hub', path: '/volunteer/dashboard', icon: LayoutDashboard },
        ];
      default:
        return [{ label: 'Home', path: '/', icon: LayoutDashboard }];
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Desktop / Laptop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-slate-300 border-r border-slate-800">
        {/* Brand Logo Header - strictly links to / without logout */}
        <Link
          to="/"
          title="Return to RakthaSethu Homepage"
          className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800 hover:bg-slate-800/50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-900 group-hover:scale-105 transition-transform">
            <Droplets className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <span className="text-lg font-black text-white tracking-tight">RakthaSethu</span>
            <span className="block text-[10px] text-rose-400 uppercase font-semibold">
              {user?.role} Portal
            </span>
          </div>
        </Link>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.displayName || user?.email}</p>
              <span className="inline-block text-[10px] uppercase font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 space-y-4 overflow-y-auto">
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
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-rose-600 text-white shadow-sm shadow-rose-900'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-rose-600 text-white font-semibold shadow-sm shadow-rose-900'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Bottom links: Go to Website & Sign Out */}
        <div className="p-3 border-t border-slate-800 space-y-1.5">
          <Link
            to="/"
            title="Return to main public website"
            className="flex items-center justify-between px-3 py-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/50"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
              {t('goToWebsite')}
            </span>
            <span className="text-[10px] text-slate-400">/</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Tablet/Mobile Drawer Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Open mobile menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile/Tablet Logo link */}
            <Link to="/" className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                <Droplets className="w-4 h-4 fill-white text-white" />
              </div>
              <span className="font-bold text-slate-900 text-sm sm:text-base">RakthaSethu</span>
            </Link>

            <h1 className="hidden sm:block text-base sm:text-lg font-bold text-slate-900">
              {isAdmin
                ? t('adminCommandCenter')
                : user?.role === 'DONOR'
                ? 'Donor Dashboard'
                : user?.role === 'HOSPITAL'
                ? 'Hospital Coordination'
                : user?.role === 'BLOOD_BANK'
                ? 'Blood Bank Operations'
                : 'Emergency Blood Portal'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Universal Go to Website CTA */}
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Return to public homepage"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              {t('goToWebsite')}
            </Link>

            {/* Language Selector */}
            <LanguageSelector variant="header" />

            {/* Real-time Notifications Dropdown */}
            <NotificationDropdown />
          </div>
        </header>

        {/* Mobile / Tablet Responsive Drawer Modal */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-150">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <Link
                  to="/"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                    <Droplets className="w-5 h-5 fill-white text-white" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-white">RakthaSethu</span>
                    <span className="block text-[10px] text-rose-400 uppercase font-semibold">
                      {user?.role}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="mt-4 space-y-1 flex-1 overflow-y-auto">
                {isAdmin
                  ? getAdminNavSections().map((sec) => (
                      <div key={sec.heading} className="pt-2">
                        <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          {sec.heading}
                        </span>
                        {sec.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className="block px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    ))
                  : getRoleLinks().map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ))}
              </nav>

              {/* Drawer Footer with Language & Actions */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <LanguageSelector variant="drawer" />

                <Link
                  to="/"
                  onClick={() => setSidebarOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t('goToWebsite')}
                </Link>

                <button
                  onClick={() => {
                    handleLogout();
                    setSidebarOpen(false);
                  }}
                  className="w-full text-center py-2 px-3 text-rose-400 hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-colors"
                >
                  {t('signOut')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
