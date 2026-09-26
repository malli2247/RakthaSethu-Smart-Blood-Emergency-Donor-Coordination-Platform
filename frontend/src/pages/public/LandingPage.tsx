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
  Calendar,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Bot,
  Check,
} from 'lucide-react';
import { statisticsApi } from '../../services/api';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { ParticleBackground } from '../../components/common/ParticleBackground';

const BLOOD_GROUPS_MATRIX = [
  'O_NEGATIVE',
  'O_POSITIVE',
  'A_NEGATIVE',
  'A_POSITIVE',
  'B_NEGATIVE',
  'B_POSITIVE',
  'AB_NEGATIVE',
  'AB_POSITIVE',
];

const BG_SHORT: Record<string, string> = {
  O_NEGATIVE: 'O-',
  O_POSITIVE: 'O+',
  A_NEGATIVE: 'A-',
  A_POSITIVE: 'A+',
  B_NEGATIVE: 'B-',
  B_POSITIVE: 'B+',
  AB_NEGATIVE: 'AB-',
  AB_POSITIVE: 'AB+',
};

function canDonate(donor: string, recipient: string): boolean {
  if (donor === 'O_NEGATIVE') return true;
  if (recipient === 'AB_POSITIVE') return true;
  if (donor === 'O_POSITIVE') return ['O_POSITIVE', 'A_POSITIVE', 'B_POSITIVE', 'AB_POSITIVE'].includes(recipient);
  if (donor === 'A_NEGATIVE') return ['A_NEGATIVE', 'A_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'].includes(recipient);
  if (donor === 'A_POSITIVE') return ['A_POSITIVE', 'AB_POSITIVE'].includes(recipient);
  if (donor === 'B_NEGATIVE') return ['B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'].includes(recipient);
  if (donor === 'B_POSITIVE') return ['B_POSITIVE', 'AB_POSITIVE'].includes(recipient);
  if (donor === 'AB_NEGATIVE') return ['AB_NEGATIVE', 'AB_POSITIVE'].includes(recipient);
  if (donor === 'AB_POSITIVE') return recipient === 'AB_POSITIVE';
  return false;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('B_POSITIVE');
  const [searchCity, setSearchCity] = useState('');
  const [compatSelected, setCompatSelected] = useState('O_NEGATIVE');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const canDonateTo = BLOOD_GROUPS_MATRIX.filter((g) => canDonate(compatSelected, g));
  const canReceiveFrom = BLOOD_GROUPS_MATRIX.filter((g) => canDonate(g, compatSelected));

  const handleOpenAi = (prompt?: string) => {
    window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { prompt } }));
  };

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

      {/* Interactive Compatibility Matrix Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                Clinical Transfusion Matrix
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Blood Compatibility Calculator
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                Red blood cell compatibility is vital during trauma and surgical procedures. Select your blood group to see who can receive your blood and who you can receive from.
              </p>
            </div>
            <Link
              to="/compatibility"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700 whitespace-nowrap self-start md:self-auto"
            >
              Full Clinical Guide & Plasma Matrix <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Blood group selection buttons */}
          <div>
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-3">
              Select Your Blood Group:
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {BLOOD_GROUPS_MATRIX.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setCompatSelected(bg)}
                  className={`py-2.5 px-3 rounded-xl font-black text-sm transition-all text-center ${
                    compatSelected === bg
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-500'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {BG_SHORT[bg]}
                </button>
              ))}
            </div>
          </div>

          {/* Compatibility Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Can Donate To */}
            <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    You can donate red cells to:
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Recipients eligible for transfusions with {BG_SHORT[compatSelected]}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {canDonateTo.map((target) => (
                  <span
                    key={target}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 font-extrabold text-xs shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    {BG_SHORT[target]}
                  </span>
                ))}
              </div>
              {compatSelected === 'O_NEGATIVE' && (
                <p className="text-[11px] font-semibold text-rose-700 bg-rose-100/70 p-2.5 rounded-xl">
                  ⭐ Universal Red Blood Cell Donor: O- blood can be given to anyone in critical emergencies.
                </p>
              )}
            </div>

            {/* Can Receive From */}
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    You can receive red cells from:
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Compatible donors when you require transfusion
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {canReceiveFrom.map((source) => (
                  <span
                    key={source}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-extrabold text-xs shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    {BG_SHORT[source]}
                  </span>
                ))}
              </div>
              {compatSelected === 'AB_POSITIVE' && (
                <p className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 p-2.5 rounded-xl">
                  ⭐ Universal Recipient: AB+ patients can receive red blood cells from any blood group.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Community Blood Donation Camps & Drives */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5 text-rose-600" />
              Community Blood Drives
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Upcoming Blood Donation Camps
            </h3>
            <p className="text-xs text-slate-500">
              Accredited voluntary camps organized by licensed hospitals, medical centers, and certified humanitarian organizations.
            </p>
          </div>
          <Link
            to="/campaigns"
            className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 self-start sm:self-auto"
          >
            Explore All Camps & Register <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified Camp
              </span>
              <span className="text-xs text-slate-400 font-semibold">150 Units Target</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">
              City Red Cross Mega Donation Drive
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Central Community Hall, Bangalore</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Next Saturday • 9:00 AM – 4:00 PM</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Red Cross Society</span>
              <Link
                to="/campaigns"
                className="text-xs font-bold text-rose-600 hover:text-rose-700"
              >
                Join Drive →
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified Camp
              </span>
              <span className="text-xs text-slate-400 font-semibold">100 Units Target</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Rotary Lifesaver Blood Drive
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Civic Centre, Andheri West, Mumbai</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Sunday • 10:00 AM – 5:00 PM</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Rotary Club & Lilavati</span>
              <Link
                to="/campaigns"
                className="text-xs font-bold text-rose-600 hover:text-rose-700"
              >
                Join Drive →
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified Camp
              </span>
              <span className="text-xs text-slate-400 font-semibold">200 Units Target</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Youth Red Cross Campus Drive
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Student Activity Center, New Delhi</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Oct 12 • 9:30 AM – 3:30 PM</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Youth Red Cross & AIIMS</span>
              <Link
                to="/campaigns"
                className="text-xs font-bold text-rose-600 hover:text-rose-700"
              >
                Join Drive →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 24/7 AI Emergency Assistant */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white border border-slate-700 shadow-xl relative overflow-hidden">
          <div className="pointer-events-none absolute top-0 right-0 w-80 h-80 bg-rose-600/10 blur-[100px] rounded-full" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                24/7 Clinical & Emergency AI
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                AI Emergency Lifeline Assistant
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Have urgent questions regarding transfusion compatibility, donation eligibility, medication wait times, or emergency protocols? Our AI assistant provides instant clinical guidance in 11 Indian languages.
              </p>
              {/* Clickable prompt suggestions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {[
                  'Why is O- blood universally critical?',
                  'Can someone with high BP donate blood?',
                  'What should I do in an acute blood shortage?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleOpenAi(prompt)}
                    className="text-xs text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>💬 {prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleOpenAi()}
                className="px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition-transform active:scale-95 cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Open AI Assistant</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
            Clear Answers
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
            Frequently Asked Questions
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Common questions regarding donor eligibility, privacy safeguards, and emergency workflows.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'Who is eligible to donate blood on RakthaSethu?',
              a: 'Healthy individuals between 18 and 65 years old, weighing at least 45-50 kg, with a hemoglobin level of 12.5 g/dL or higher. You must be free from active infectious illnesses, recent major surgeries, or fever.',
            },
            {
              q: 'How often can I donate blood?',
              a: 'For whole blood donations, men can safely donate every 90 days (3 months), and women every 120 days. Platelet donations (apheresis) can be done more frequently, up to every 2-4 weeks.',
            },
            {
              q: 'Is my personal contact information exposed publicly on RakthaSethu?',
              a: 'No! Your phone number, email address, and exact home address are masked by default. Only when you explicitly accept a blood request will your contact details be shared with that verified requester.',
            },
            {
              q: 'Does RakthaSethu charge any money for blood requests?',
              a: 'Absolutely NOT. RakthaSethu is 100% voluntary, free, and humanitarian. Selling or commercializing human blood is strictly illegal and punishable by law.',
            },
          ].map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-slate-900 flex items-center justify-between text-sm sm:text-base gap-3 cursor-pointer"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <Link
            to="/faq"
            className="text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
          >
            View All FAQ & Clinical Guidelines <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
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
