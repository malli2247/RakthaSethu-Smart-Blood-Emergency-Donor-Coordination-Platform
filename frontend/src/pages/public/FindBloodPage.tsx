import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { matchingApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Search,
  MapPin,
  ShieldCheck,
  Phone,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Send,
  SlidersHorizontal,
} from 'lucide-react';

export const FindBloodPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialGroup = searchParams.get('bloodGroup') || 'O_POSITIVE';
  const initialCity = searchParams.get('city') || '';

  const [bloodGroup, setBloodGroup] = useState(initialGroup);
  const [city, setCity] = useState(initialCity);
  const [unitsRequired, setUnitsRequired] = useState(1);
  const [urgency, setUrgency] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [radius, setRadius] = useState<number>(25);

  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [requestSentMap, setRequestSentMap] = useState<Record<string, boolean>>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await matchingApi.findDonors({
        bloodGroup,
        city: city || undefined,
        urgency,
        maxRadiusKm: radius,
        limit: 30,
      });
      setDonors(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBlood = (donorId: string) => {
    if (!isAuthenticated) {
      // Prompt user to sign in to send donor request
      navigate(`/login?redirect=${encodeURIComponent(`/find-blood?bloodGroup=${bloodGroup}&city=${city}`)}`);
      return;
    }

    // Direct receiver to create-request with matched donor preselected
    navigate(
      `/patient/create-request?bloodGroup=${bloodGroup}&donorId=${donorId}&city=${encodeURIComponent(
        city
      )}&units=${unitsRequired}&urgency=${urgency}`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
          <Search className="w-3.5 h-3.5" />
          {t('findBlood')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {t('findBloodTitle')}
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          {t('findBloodSubtitle')}
        </p>
      </div>

      {/* Filter / Search Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Blood Group */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('patientBloodGroup')}
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold text-slate-800"
              >
                <option value="O_NEGATIVE">O- (Universal RBC Donor)</option>
                <option value="O_POSITIVE">O+</option>
                <option value="A_POSITIVE">A+</option>
                <option value="A_NEGATIVE">A-</option>
                <option value="B_POSITIVE">B+</option>
                <option value="B_NEGATIVE">B-</option>
                <option value="AB_POSITIVE">AB+ (Universal Recipient)</option>
                <option value="AB_NEGATIVE">AB-</option>
              </select>
            </div>

            {/* City / Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('locationCity')}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Hyderabad, Mumbai, Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Units Required */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('unitsRequired')}
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={unitsRequired}
                onChange={(e) => setUnitsRequired(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold text-slate-800"
              />
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('urgency')}
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold text-slate-800"
              >
                <option value="NORMAL">{t('normal')}</option>
                <option value="HIGH">{t('high')}</option>
                <option value="CRITICAL">{t('critical')}</option>
              </select>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('searchRadius')}
              </label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 font-medium"
              >
                <option value={10}>Within 10 km</option>
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
                <option value={100}>Within 100 km</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Donor identities and exact locations remain strictly protected until authorized coordination.
            </span>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-200 transition-colors"
            >
              <Search className="w-4 h-4" />
              {loading ? t('loading') : t('searchAvailableBlood')}
            </button>
          </div>
        </form>
      </div>

      {/* INITIAL STATE: Before user performs a search */}
      {!hasSearched ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <SlidersHorizontal className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {t('findBloodInitialPrompt')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Select your patient blood group, city or district, and emergency urgency above, then click{' '}
            <strong className="text-rose-600">"{t('searchAvailableBlood')}"</strong> to discover matching voluntary donors.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Zero donor records exposed prior to explicit search
            </span>
          </div>
        </div>
      ) : loading ? (
        /* Loading Skeleton */
        <div className="space-y-4">
          <div className="h-6 w-64 bg-slate-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse p-6"
              />
            ))}
          </div>
        </div>
      ) : (
        /* AFTER SEARCH STATE */
        <div className="space-y-6">
          {/* Aggregate Count Banner */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {t('donorsFoundSummary', { count: donors.length, radius })}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Filtered by RBC compatibility ({bloodGroup}), proximity, and mobile verification status.
              </p>
            </div>

            <Link
              to={`/patient/create-request?bloodGroup=${bloodGroup}&city=${encodeURIComponent(
                city
              )}&units=${unitsRequired}&urgency=${urgency}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors"
            >
              <AlertCircle className="w-4 h-4 text-rose-400" />
              {t('broadcastRequest')}
            </Link>
          </div>

          {/* Privacy-Preserved Donor Cards */}
          {donors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {donors.map((d) => (
                <div
                  key={d.donorId}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Header: Verified Donor Badge & Blood Group */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 uppercase tracking-wider">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {t('verifiedDonor')}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{d.city ? `${d.city}, ${d.state}` : 'Local District'}</span>
                          <span className="font-semibold text-rose-600">
                            • {t('approxDistance', { distance: d.approximateDistance || `${radius} km` })}
                          </span>
                        </div>
                      </div>
                      <BloodGroupBadge bloodGroup={d.bloodGroup} />
                    </div>

                    {/* Readiness Indicators */}
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t('availableForEmergency')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-medium text-emerald-700">{t('verifiedMobile')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Match quality & Request Blood Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <span className="text-slate-400 block text-[11px]">Match Score</span>
                      <span className="font-bold text-slate-800">{d.score || 95}% Fit</span>
                    </div>

                    <button
                      onClick={() => handleRequestBlood(d.donorId)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {t('requestBlood')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* No Donors Found State */
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">{t('noDonorsFound')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('noDonorsFoundDesc', { radius })}
              </p>
              <Link
                to={`/patient/create-request?bloodGroup=${bloodGroup}&city=${encodeURIComponent(
                  city
                )}&units=${unitsRequired}&urgency=${urgency}`}
                className="inline-block px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow hover:bg-rose-700"
              >
                {t('createEmergencyRequest')}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
