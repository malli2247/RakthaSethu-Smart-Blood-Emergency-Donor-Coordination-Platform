import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bloodBankApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { StatCard } from '../../components/StatCard';
import {
  Package,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Droplets,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const BloodBankDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([bloodBankApi.getProfile(), bloodBankApi.getInventory()])
      .then(([profRes, invRes]) => {
        setProfile(profRes.data?.data);
        setInventory(invRes.data?.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalUnits = inventory?.items?.reduce((acc: number, item: any) => acc + item.units, 0) || 0;
  const lowStockCount = inventory?.lowStockAlerts?.length || 0;
  const expiringSoonCount = inventory?.expiringSoonUnits?.length || 0;

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-5 sm:p-7 text-white shadow-md shadow-slate-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-800/60">
              {t('bloodBankDashboardTitle')}
            </span>
            {profile?.verificationStatus === 'VERIFIED' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Licensed Facility
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            {profile?.name || 'Central Blood Bank'}
          </h1>
          <p className="text-xs text-slate-300">
            {profile?.city ? `${profile.city}, ${profile.state || ''}` : 'Regional Blood Center'}
          </p>
        </div>

        <Link
          to="/bloodbank/inventory"
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors touch-target"
        >
          <Package className="w-4 h-4" />
          <span>{t('manageInventory')}</span>
        </Link>
      </div>

      {/* Primary Actions (Mobile-First Focus) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/bloodbank/inventory"
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between group touch-target"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('manageInventory')}</h3>
              <p className="text-xs text-slate-500">Record donations & manage refrigerated units</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/bloodbank/copilot"
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between group touch-target"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('aiCopilot')}</h3>
              <p className="text-xs text-slate-500">Automated stock forecast & matching advisory</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <StatCard
          title="Stock Available"
          value={totalUnits}
          subtitle="Refrigerated units"
          icon={<Droplets className="w-4 h-4 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title="Low Stock"
          value={lowStockCount}
          subtitle="Groups < 5 units"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          color="amber"
        />
        <StatCard
          title="Expiring Soon"
          value={expiringSoonCount}
          subtitle="Next 7 days"
          icon={<Clock className="w-4 h-4 text-rose-600" />}
          color="red"
        />
      </div>

      {/* Compact Blood Group Stock Levels */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Current Blood Stock Levels</h2>
          <p className="text-xs text-slate-500">Units available in refrigerated storage</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {[
            'O_POSITIVE',
            'O_NEGATIVE',
            'A_POSITIVE',
            'A_NEGATIVE',
            'B_POSITIVE',
            'B_NEGATIVE',
            'AB_POSITIVE',
            'AB_NEGATIVE',
          ].map((bg) => {
            const units = inventory?.summary?.[bg] || 0;
            const isLow = units < 5;

            return (
              <div
                key={bg}
                className={`p-3.5 rounded-2xl border text-center space-y-1.5 transition-all ${
                  isLow ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-center">
                  <BloodGroupBadge bloodGroup={bg} size="sm" />
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900">{units} Units</div>
                {isLow && (
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
                    Low Stock
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
