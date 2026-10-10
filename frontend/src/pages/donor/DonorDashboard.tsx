import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { donorApi, requestsApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { StatCard } from '../../components/StatCard';
import {
  Heart,
  Droplets,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  History,
  AlertCircle,
} from 'lucide-react';
import { OtpVerificationModal } from '../../components/auth/OtpVerificationModal';
import { useLanguage } from '../../contexts/LanguageContext';

export const DonorDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [otpModalOpen, setOtpModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [profileRes, statsRes, matchesRes] = await Promise.all([
        donorApi.getProfile(),
        donorApi.getStats(),
        donorApi.getMatches(),
      ]);
      setProfile(profileRes.data?.data);
      setStats(statsRes.data?.data);
      setMatches(matchesRes.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAvailability = async (field: 'isAvailable' | 'emergencyAvailable') => {
    if (!profile) return;
    const newVal = !profile[field];
    try {
      await donorApi.updateProfile({ [field]: newVal });
      setProfile({ ...profile, [field]: newVal });
      setActionMessage(newVal ? t('availableToDonate') : t('unavailableToDonate'));
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespondMatch = async (matchId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      await requestsApi.respondToMatch(matchId, action);
      setActionMessage(`Response recorded: ${action}`);
      loadData();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage(err.response?.data?.message || t('somethingWentWrong'));
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 bg-white rounded-3xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isVerified = Boolean(profile?.isPhoneVerified || profile?.user?.isPhoneVerified);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto">
      {/* ============================================================ */}
      {/* 1. WELCOME & STATUS HEADER */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-rose-600 to-red-700 rounded-3xl p-5 sm:p-7 text-white shadow-md shadow-rose-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
            <span className={`w-2 h-2 rounded-full ${profile?.isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
            {profile?.isAvailable ? t('availableToDonate') : t('unavailableToDonate')}
          </div>
          <h1 className="text-xl sm:text-2xl font-black">
            {t('welcomeBack')}, {profile?.fullName || 'Hero Donor'}
          </h1>
          <p className="text-xs text-rose-100">
            {profile?.city ? `${profile.city}, ` : ''}{profile?.state || ''} • Blood Group:{' '}
            <span className="font-black underline">{profile?.bloodGroup?.replace('_POSITIVE', '+').replace('_NEGATIVE', '-') || 'Active'}</span>
          </p>
        </div>

        {/* Quick Availability Switch */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleToggleAvailability('isAvailable')}
            className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-target ${
              profile?.isAvailable
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${profile?.isAvailable ? 'bg-white' : 'bg-slate-300'}`} />
            <span>{profile?.isAvailable ? t('availableToDonate') : t('unavailableToDonate')}</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. PRIMARY ACTIONS (Mobile-First Dominant Targets) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/donor/requests"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-rose-200 hover:border-rose-400 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between group touch-target"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {t('emergencyRequests')}
                {matches.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                    {matches.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">Respond to patients in urgent need</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/donor/history"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between group touch-target"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('donationHistory')}</h3>
              <p className="text-xs text-slate-500">View certificates & past records</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* ============================================================ */}
      {/* 3. IMPORTANT STATUS & VERIFICATION */}
      {/* ============================================================ */}
      {!isVerified && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-amber-900">{t('verifyMobileTitle')}</h3>
              <p className="text-xs text-amber-700">{t('verifyPromptNotice')}</p>
            </div>
          </div>
          <button
            onClick={() => setOtpModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer touch-target flex items-center justify-center"
          >
            {t('verifyOtp')}
          </button>
        </div>
      )}

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. RECENT EMERGENCY MATCHES */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">{t('emergencyRequests')}</h2>
            <p className="text-xs text-slate-500">Matching blood group requests in your perimeter</p>
          </div>
          {matches.length > 0 && (
            <Link to="/donor/requests" className="text-xs font-bold text-rose-600 hover:text-rose-700">
              {t('viewAll')} ({matches.length})
            </Link>
          )}
        </div>

        {matches.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {matches.slice(0, 3).map((m) => {
              const req = m.request;
              if (!req) return null;
              const isAccepted = m.status === 'ACCEPTED';
              const isDeclined = m.status === 'DECLINED';

              return (
                <div
                  key={m.id}
                  className="py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BloodGroupBadge bloodGroup={req.bloodGroup} size="sm" />
                      <UrgencyBadge urgency={req.urgency} />
                      <span className="text-xs font-bold text-slate-800">
                        {req.patientName || 'Emergency Patient'} • {req.unitsRequired} Unit{req.unitsRequired > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {req.hospitalName || 'Regional Hospital'}, {req.hospitalCity || profile?.city}
                      </span>
                      {req.requiredBy && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(req.requiredBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center w-full sm:w-auto">
                    {isAccepted ? (
                      <span className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {t('accepted')}
                      </span>
                    ) : isDeclined ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs">
                        Declined
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleRespondMatch(m.id, 'ACCEPT')}
                          className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer touch-target"
                        >
                          I Can Donate
                        </button>
                        <button
                          onClick={() => handleRespondMatch(m.id, 'DECLINE')}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs cursor-pointer touch-target"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-xs sm:text-sm font-bold text-slate-800">{t('noActiveRequests')}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              You will receive push & SMS alerts when an emergency matches your profile.
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. SECONDARY VERIFIED METRICS (Compact Responsive Grid) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title={t('donationsCompleted')}
          value={stats?.donationsCompleted || 0}
          subtitle="Verified donations"
          icon={<Droplets className="w-4 h-4 text-emerald-600" />}
          color="emerald"
        />
        <StatCard
          title={t('unitsDonated')}
          value={stats?.unitsDonated || stats?.donationsCompleted || 0}
          subtitle="Units provided"
          icon={<Heart className="w-4 h-4 text-rose-600" />}
          color="red"
        />
        <StatCard
          title={t('requestsHelped')}
          value={stats?.requestsFulfilled || 0}
          subtitle="Emergencies helped"
          icon={<Activity className="w-4 h-4 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title={t('eligible')}
          value={
            profile?.daysUntilEligible > 0
              ? `In ${profile.daysUntilEligible}d`
              : 'Eligible Today'
          }
          subtitle="Subject to triage"
          icon={<Calendar className="w-4 h-4 text-purple-600" />}
          color="purple"
        />
      </div>

      <OtpVerificationModal
        phone={profile?.user?.phone || ''}
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        onVerified={() => {
          loadData();
          setActionMessage(t('otpSuccessMessage'));
          setTimeout(() => setActionMessage(null), 4000);
        }}
      />
    </div>
  );
};
