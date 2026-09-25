import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Droplets,
  Heart,
  ShieldCheck,
  Zap,
  Activity,
  MapPin,
  Clock,
  ArrowRight,
  Search,
  CheckCircle,
  AlertCircle,
  Users,
  Building2,
  RefreshCw,
  Sparkles,
  Award,
} from 'lucide-react';
import { statisticsApi } from '../../services/api';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { ParticleBackground } from '../../components/common/ParticleBackground';
import { TruthfulEmptyState } from '../../components/common/TruthfulEmptyState';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('B_POSITIVE');
  const [searchCity, setSearchCity] = useState('');

  // 1. Fetch 100% database-driven public statistics
  const {
    data: statsData,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['public_statistics'],
    queryFn: async () => {
      const res = await statisticsApi.getPublic();
      return res.data?.data;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });

  // 2. Fetch live activity feed
  const {
    data: rawActivityData,
    isLoading: isActivityLoading,
  } = useQuery({
    queryKey: ['public_activity'],
    queryFn: async () => {
      const res = await statisticsApi.getActivity();
      return res.data?.data || [];
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
  const activityData = Array.isArray(rawActivityData) ? rawActivityData : [];

  // 3. Fetch live blood inventory
  const {
    data: rawInventoryData,
    isLoading: isInventoryLoading,
  } = useQuery({
    queryKey: ['public_inventory'],
    queryFn: async () => {
      const res = await statisticsApi.getInventory();
      return res.data?.data || [];
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const inventoryData = Array.isArray(rawInventoryData) ? rawInventoryData : [];

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/find-blood?bloodGroup=${selectedBloodGroup}&city=${encodeURIComponent(searchCity)}`);
  };

  const stats = statsData || {
    users: 0,
    donors: 0,
    hospitals: 0,
    bloodBanks: 0,
    volunteers: 0,
    bloodRequests: 0,
    fulfilledRequests: 0,
    successfulDonations: 0,
    bloodUnitsDonated: 0,
    livesImpacted: 0,
    fulfillmentRate: 0,
  };

  const isZeroState =
    (stats.donors === 0 && stats.fulfilledRequests === 0 && stats.hospitals === 0);

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-950 via-slate-900 to-slate-950 text-white pt-16 pb-24 border-b border-rose-900/30">
        {/* Soft flowing particle background */}
        <ParticleBackground className="opacity-60" particleCount={36} />

        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-rose-600/15 blur-[120px] rounded-full" />
        <div className="pointer-events-none absolute bottom-0 right-10 w-96 h-96 bg-red-800/10 blur-[100px] rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </span>
                24/7 Real-Time Emergency Lifeline
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                Connecting blood donors with people who need help —{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-red-500">
                  when every second matters.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                RakthaSethu connects voluntary blood donors, emergency patients, certified
                hospitals, and licensed blood banks instantly through truthful data, smart
                geo-matching, and progressive discovery.
              </p>

              {/* Major CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/patient/create-request"
                  className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 hover:shadow-rose-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <AlertCircle className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
                  <span>Request Blood Emergency</span>
                </Link>
                <Link
                  to="/register?role=DONOR"
                  className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold bg-slate-800/80 hover:bg-slate-700/80 text-white border border-slate-700 backdrop-blur-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <Heart className="w-5 h-5 text-rose-400 fill-rose-500/20 group-hover:fill-rose-500 transition-colors" />
                  <span>Become a Donor</span>
                </Link>
              </div>

              {/* Verified Features */}
              <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  100% Database-Driven Metrics
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-400" />
                  Progressive 5km–100km Geo-Match
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Zero Platform Fee & Privacy Safe
                </span>
              </div>
            </div>

            {/* Right Quick Search Card */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl backdrop-blur-xl relative">
                <div className="absolute -top-3 right-6 bg-rose-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-md tracking-wider">
                  Live Match Engine
                </div>

                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Search className="w-5 h-5 text-rose-500" />
                  Quick Donor Discovery
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Search verified voluntary donors and available units in your city immediately.
                </p>

                <form onSubmit={handleQuickSearch} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Blood Group Required
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        'O_POSITIVE',
                        'O_NEGATIVE',
                        'A_POSITIVE',
                        'A_NEGATIVE',
                        'B_POSITIVE',
                        'B_NEGATIVE',
                        'AB_POSITIVE',
                        'AB_NEGATIVE',
                      ].map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setSelectedBloodGroup(bg)}
                          className={`py-2 text-xs font-black rounded-xl border transition-all ${
                            selectedBloodGroup === bg
                              ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/30'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {bg.replace('_POSITIVE', '+').replace('_NEGATIVE', '-')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Location / City
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        placeholder="e.g. Bangalore, Mumbai, Delhi"
                        value={searchCity}
                        onChange={(e) => setSearchCity(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-3 text-sm rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition-all cursor-pointer"
                  >
                    <span>Search Available Donors</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 100% Real Database-Driven Impact Statistics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Activity className="w-3.5 h-3.5 text-rose-600" />
            Live Platform Telemetry
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Real Community Impact — 100% Database-Driven
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Every metric below is dynamically aggregated from actual verified database records.
            Zero hardcoded estimates. Zero fabricated marketing counters.
          </p>
        </div>

        {/* Loading Skeleton */}
        {isStatsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 rounded-3xl bg-slate-100 h-32 border border-slate-200" />
            ))}
          </div>
        ) : isStatsError ? (
          <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-center space-y-3">
            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
            <p className="text-sm font-semibold text-rose-900">
              Statistics telemetry is momentarily unavailable.
            </p>
            <button
              onClick={() => refetchStats()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Stat 1: Verified Donors */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow text-center space-y-2">
              <div className="inline-flex p-2.5 rounded-2xl bg-rose-50 text-rose-600 mb-1">
                <Heart className="w-5 h-5" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900">
                <AnimatedCounter value={stats.donors} />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">
                Verified Blood Donors
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {stats.donors === 0
                  ? 'Be the first donor to join our lifeline.'
                  : `${stats.totalVerifiedDonors} registered on network`}
              </p>
            </div>

            {/* Stat 2: Emergencies Fulfilled */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow text-center space-y-2">
              <div className="inline-flex p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 mb-1">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900">
                <AnimatedCounter value={stats.fulfilledRequests} />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">
                Emergencies Fulfilled
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {stats.fulfilledRequests === 0
                  ? 'All calm. Standing by for dispatch.'
                  : `${stats.fulfillmentRate}% fulfillment success rate`}
              </p>
            </div>

            {/* Stat 3: Network Hospitals */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow text-center space-y-2">
              <div className="inline-flex p-2.5 rounded-2xl bg-blue-50 text-blue-600 mb-1">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900">
                <AnimatedCounter value={stats.hospitals} />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">
                Verified Hospitals
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {stats.hospitals === 0
                  ? 'Hospital verification in progress.'
                  : `${stats.bloodBanks} certified blood banks`}
              </p>
            </div>

            {/* Stat 4: Blood Units Donated */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow text-center space-y-2">
              <div className="inline-flex p-2.5 rounded-2xl bg-purple-50 text-purple-600 mb-1">
                <Droplets className="w-5 h-5" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900">
                <AnimatedCounter value={stats.bloodUnitsDonated} />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">
                Blood Units Donated
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {stats.bloodUnitsDonated === 0
                  ? 'Confirmed units via hospital certificates.'
                  : `${stats.successfulDonations} donation events recorded`}
              </p>
            </div>
          </div>
        )}

        {/* Truthful Baseline Notice when Database is Fresh */}
        {isZeroState && !isStatsLoading && (
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center max-w-2xl mx-auto space-y-1">
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              🌱 RakthaSethu starts from a truthful baseline
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              We never fabricate numbers. When you register as a donor or an accredited hospital verifies
              their facility, the platform counters will animate from 0 → 1 in real time.
            </p>
          </div>
        )}
      </section>

      {/* Dynamic Blood Inventory Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Verified Blood Bank Inventory Overview
            </h3>
            <p className="text-xs text-slate-500">
              Real units available across accredited blood bank storage centers.
            </p>
          </div>
          <Link
            to="/find-blood"
            className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
          >
            Detailed Donor Matching <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isInventoryLoading ? (
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {inventoryData.map((item: any) => (
              <div
                key={item.bloodGroup}
                className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <span className="text-sm font-black text-rose-600 block">
                  {item.bloodGroup}
                </span>
                <span className="text-xl font-black text-slate-900 block">
                  <AnimatedCounter value={item.units} />
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider block px-1.5 py-0.5 rounded-md ${
                    item.status === 'ADEQUATE'
                      ? 'bg-emerald-50 text-emerald-700'
                      : item.status === 'CRITICAL'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dynamic Activity Feed */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Live Network Activity</h3>
            <p className="text-xs text-slate-500">
              Anonymized real events streaming across our emergency network.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live DB Feed
          </div>
        </div>

        {isActivityLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : activityData.length === 0 ? (
          <TruthfulEmptyState
            icon={<Activity className="w-8 h-8" />}
            title="Recent activity will appear here as the community grows"
            description="When an emergency blood request is submitted, a donor verifies, or a hospital confirms a donation, verified live updates will stream into this feed."
            actionText="Register as First Donor"
            actionLink="/register?role=DONOR"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activityData.map((item: any) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3.5 hover:shadow-xs transition-shadow"
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    item.type === 'FULFILLED'
                      ? 'bg-emerald-50 text-emerald-600'
                      : item.type === 'DONATION'
                      ? 'bg-purple-50 text-purple-600'
                      : item.type === 'HOSPITAL_JOINED'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {item.type === 'FULFILLED' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : item.type === 'DONATION' ? (
                    <Droplets className="w-4 h-4" />
                  ) : item.type === 'HOSPITAL_JOINED' ? (
                    <Building2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How RakthaSethu Saves Lives */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            How RakthaSethu Works
          </h2>
          <p className="text-slate-600 mt-2 text-sm">
            A reliable technology pipeline that coordinates critical emergency response in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-lg border border-rose-100">
              1
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Post Emergency Request
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Patient family or attending doctor submits the required blood group, units, and
              hospital location through our multi-step emergency wizard.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-100">
              2
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Progressive Geo-Match
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Our matching engine evaluates compatible blood groups and progressively expands search
              from 5km to 100km without exposing donor private home coordinates.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg border border-emerald-100">
              3
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Direct Connect & Certificate
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              When a donor accepts, direct contact unlocks. The accredited hospital validates the
              donation, updates database stock, and issues a cryptographic certificate.
            </p>
          </div>
        </div>
      </section>

      {/* Call to action card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-rose-900/20">
          <div className="space-y-3 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-black">
              Ready to help save a life in an emergency?
            </h3>
            <p className="text-rose-100 max-w-xl text-xs sm:text-sm leading-relaxed">
              A single blood donation takes under 20 minutes and can help up to 3 patients. Join our
              verified community network today.
            </p>
          </div>
          <Link
            to="/register?role=DONOR"
            className="px-8 py-4 rounded-xl bg-white text-rose-700 font-extrabold hover:bg-rose-50 shadow-lg whitespace-nowrap transition-transform active:scale-95"
          >
            Register as Blood Donor
          </Link>
        </div>
      </section>
    </div>
  );
};
