import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hospitalApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { StatCard } from '../../components/StatCard';
import {
  Building2,
  AlertCircle,
  Heart,
  FilePlus,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const HospitalDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([hospitalApi.getProfile(), hospitalApi.getRequests()])
      .then(([profRes, reqRes]) => {
        setProfile(profRes.data?.data);
        setRequests(reqRes.data?.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalRequests = requests.length;
  const fulfilledCount = requests.filter((r) => r.status === 'FULFILLED').length;
  const activeCount = requests.filter((r) => !['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(r.status)).length;

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto">
      {/* Hospital Identity Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-5 sm:p-7 text-white shadow-md shadow-slate-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-800/60">
              Hospital Coordination
            </span>
            {profile?.verificationStatus === 'VERIFIED' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            {profile?.name || 'Hospital Clinical Hub'}
          </h1>
          <p className="text-xs text-slate-300">
            {profile?.city ? `${profile.city}, ${profile.state || ''}` : 'Healthcare Partner'}
          </p>
        </div>

        <Link
          to="/patient/create-request"
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors touch-target"
        >
          <FilePlus className="w-4 h-4" />
          <span>{t('createEmergencyRequest')}</span>
        </Link>
      </div>

      {/* Primary Actions (Mobile-First Focus) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/hospital/requests"
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between group touch-target"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('manageRequests')}</h3>
              <p className="text-xs text-slate-500">Track matched donors & incoming volunteers</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/hospital/confirm-donation"
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between group touch-target"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('confirmDonations')}</h3>
              <p className="text-xs text-slate-500">Verify successful clinical transfusions</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <StatCard
          title={t('activeRequests')}
          value={activeCount}
          subtitle="In matching"
          icon={<AlertCircle className="w-4 h-4 text-rose-600" />}
          color="red"
        />
        <StatCard
          title={t('completed')}
          value={fulfilledCount}
          subtitle="Fulfilled units"
          icon={<Heart className="w-4 h-4 text-emerald-600" />}
          color="emerald"
        />
        <StatCard
          title="Total Requests"
          value={totalRequests}
          subtitle="Hospital requisitions"
          icon={<Building2 className="w-4 h-4 text-blue-600" />}
          color="blue"
        />
      </div>

      {/* Active Requests Stream */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            {t('activeRequests')} ({activeCount})
          </h2>
          <Link to="/hospital/requests" className="text-xs font-bold text-rose-600 hover:text-rose-700">
            {t('viewAll')}
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : requests.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {requests.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <BloodGroupBadge bloodGroup={r.bloodGroup} size="sm" />
                    <UrgencyBadge urgency={r.urgency} />
                    <StatusBadge status={r.status} />
                    <span className="text-xs font-bold text-slate-700">
                      {r.unitsRequired} Unit{r.unitsRequired > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Patient: {r.patientName}
                  </h3>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <Link
                    to={`/emergency/search/${r.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs touch-target flex items-center justify-center"
                  >
                    Track Matching
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-xs sm:text-sm font-bold text-slate-800">{t('noActiveRequests')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
