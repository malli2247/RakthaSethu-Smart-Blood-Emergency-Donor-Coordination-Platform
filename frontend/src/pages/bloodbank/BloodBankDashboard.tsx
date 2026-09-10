import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bloodBankApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { StatCard } from '../../components/StatCard';
import {
  Package,
  AlertTriangle,
  Clock,
  PlusCircle,
  ShieldCheck,
  Droplets,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const BloodBankDashboard: React.FC = () => {
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
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              Blood Bank Facility
            </span>
            {profile?.verificationStatus === 'VERIFIED' ? (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Licensed Blood Center
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Verification Pending
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {profile?.name || 'Central Blood Bank'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {profile?.address}, {profile?.city}, {profile?.state} • License: {profile?.licenseNumber}
          </p>
        </div>

        <Link
          to="/bloodbank/inventory"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-200 transition-colors shrink-0"
        >
          <Package className="w-4 h-4" />
          Manage Stock Inventory
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Available Units"
          value={totalUnits}
          subtitle={`Capacity: ${profile?.storageCapacity || 1000} units`}
          icon={<Droplets className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Low Stock Warnings"
          value={lowStockCount}
          subtitle="Blood groups below 5 units"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Units Expiring Soon"
          value={expiringSoonCount}
          subtitle="Within next 7 days"
          icon={<Clock className="w-5 h-5" />}
          color="red"
        />
      </div>

      {/* Stock Levels by Blood Group */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Current Blood Stock Levels</h2>
          <p className="text-xs text-slate-500">
            Real-time units available in refrigerated storage.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                className={`p-4 rounded-2xl border text-center space-y-2 transition-all ${
                  isLow ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-center">
                  <BloodGroupBadge bloodGroup={bg} size="sm" />
                </div>
                <div className="text-2xl font-black text-slate-900">{units} Units</div>
                {isLow && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
                    Low Stock Alert
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
