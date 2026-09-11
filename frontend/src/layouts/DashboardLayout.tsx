import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  Bell,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { notificationApi } from '../services/api';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationApi
      .list()
      .then((res) => {
        setUnreadCount(res.data?.data?.unreadCount || 0);
      })
      .catch(() => {});
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getNavLinks = () => {
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
      case 'ADMIN':
        return [
          { label: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
          { label: 'Command Center', path: '/admin/command-center', icon: ShieldAlert },
          { label: 'Emergency Simulator', path: '/admin/simulator', icon: Compass },
          { label: 'User Directory', path: '/admin/users', icon: Users },
          { label: 'Verifications', path: '/admin/verifications', icon: ShieldCheck },
        ];
      default:
        return [{ label: 'Home', path: '/', icon: LayoutDashboard }];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-slate-900 text-slate-300 border-r border-slate-800">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
            <Droplets className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">RakthaSethu</span>
            <span className="block text-[10px] text-rose-400 uppercase font-semibold">
              {user?.role} Portal
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'ME'}
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
        <nav className="flex-1 px-3 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
        </nav>

        {/* Bottom links */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link
            to="/"
            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <span>Public Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              {user?.role === 'ADMIN'
                ? 'System Administration'
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
            <Link
              to="/find-blood"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
            >
              Search Compatible Donors
            </Link>

            <div className="relative">
              <button className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                <Bell className="w-5 h-5" />
              </button>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Mobile menu modal */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative w-64 bg-slate-900 text-slate-300 flex flex-col p-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="text-base font-bold text-white">RakthaSethu</span>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1 flex-1">
                {navLinks.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <button
                onClick={() => {
                  handleLogout();
                  setSidebarOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-rose-400 text-sm font-semibold"
              >
                Sign Out
              </button>
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
