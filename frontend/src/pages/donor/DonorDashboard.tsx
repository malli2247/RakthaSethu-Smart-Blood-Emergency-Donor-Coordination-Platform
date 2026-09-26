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
  AlertCircle,
  Calendar,
  CheckCircle2,
  X,
  Clock,
  MapPin,
  Sparkles,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { OtpVerificationModal } from '../../components/auth/OtpVerificationModal';

export const DonorDashboard: React.FC = () => {
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
      setActionMessage(`Updated ${field === 'isAvailable' ? 'Availability' : 'Emergency readiness'}`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespondMatch = async (matchId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      await requestsApi.respondToMatch(matchId, action);
      setActionMessage(`Request response recorded: ${action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED'}`);
      loadData();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage(err.response?.data?.message || 'Error updating response');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Toggles */}
      <div className="bg-gradient-to-r from-rose-600 to-red-700 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg shadow-rose-200">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Verified Hero Donor
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Welcome back, {profile?.fullName || 'Donor'}!
          </h1>
          <p className="text-xs sm:text-sm text-rose-100 max-w-xl">
            You are saving lives in {profile?.city}, {profile?.state}. Your blood group:{' '}
            <strong className="underline">{profile?.bloodGroup?.replace('_', '+')}</strong>.
          </p>
        </div>

        {/* Toggles */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => handleToggleAvailability('isAvailable')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              profile?.isAvailable
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                profile?.isAvailable ? 'bg-white animate-ping' : 'bg-slate-300'
              }`}
            />
            {profile?.isAvailable ? 'Available to Donate' : 'Unavailable'}
          </button>

          <button
            onClick={() => handleToggleAvailability('emergencyAvailable')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              profile?.emergencyAvailable
                ? 'bg-white text-rose-700 shadow-sm'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {profile?.emergencyAvailable ? 'Emergency Ready' : 'Standard Queue'}
          </button>
        </div>
      </div>

      {/* Mobile Verification Alert Banner */}
      {!profile?.user?.isVerified && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Mobile Number Verification Required</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Verify your mobile number to receive real-time blood request alerts and participate in active donor matching.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOtpModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-sm"
          >
            Verify Mobile via OTP
          </button>
        </div>
      )}

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {actionMessage}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Lives Potentially Helped"
          value={stats?.livesPotentiallyHelped || 0}
          subtitle="1 unit can save up to 3 lives"
          icon={<Heart className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Total Donations"
          value={stats?.donationsCompleted || 0}
          subtitle="Confirmed blood donations"
          icon={<Droplets className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Requests Received"
          value={stats?.requestsReceived || 0}
          subtitle="Matching notifications"
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Next Eligible Donation"
          value={
            profile?.daysUntilEligible > 0
              ? `In ${profile.daysUntilEligible} days`
              : 'Eligible Today'
          }
          subtitle={
            profile?.nextEligibleDate
              ? new Date(profile.nextEligibleDate).toLocaleDateString()
              : 'Ready to donate'
          }
          icon={<Calendar className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Live Emergency Requests Feed */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Emergency Requests For You</h2>
            <p className="text-xs text-slate-500">
              Patients requiring your blood group in {profile?.city} and nearby hospitals.
            </p>
          </div>
          <Link
            to="/donor/requests"
            className="text-xs font-bold text-rose-600 hover:text-rose-700"
          >
            View All ({matches.length})
          </Link>
        </div>

        {matches.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {matches.slice(0, 5).map((m) => {
              const req = m.request;
              if (!req) return null;
              const isAccepted = m.status === 'ACCEPTED';
              const isDeclined = m.status === 'DECLINED';

              return (
                <div
                  key={m.id}
                  className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <BloodGroupBadge bloodGroup={req.bloodGroup} size="sm" />
                      <UrgencyBadge urgency={req.urgency} />
                      <span className="text-xs font-extrabold text-slate-800">
                        {req.patientName} ({req.unitsRequired} Unit{req.unitsRequired > 1 ? 's' : ''})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {req.hospitalName}, {req.hospitalCity}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Required by {new Date(req.requiredBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {req.medicalReason && (
                      <p className="text-xs text-slate-600 italic">"{req.medicalReason}"</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {isAccepted ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Accepted — Contacting Hospital
                      </span>
                    ) : isDeclined ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs">
                        Declined
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRespondMatch(m.id, 'ACCEPT')}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
                        >
                          I Can Donate
                        </button>
                        <button
                          onClick={() => handleRespondMatch(m.id, 'DECLINE')}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No Pending Emergency Requests</p>
            <p className="text-xs text-slate-500 mt-0.5">
              You will be notified immediately when a patient nearby matches your blood group.
            </p>
          </div>
        )}
      </div>

      <OtpVerificationModal
        phone={profile?.user?.phone || ''}
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        onVerified={() => {
          loadData();
          setActionMessage('Mobile number verified! You are now eligible for active donor matching.');
          setTimeout(() => setActionMessage(null), 4000);
        }}
      />
    </div>
  );
};
