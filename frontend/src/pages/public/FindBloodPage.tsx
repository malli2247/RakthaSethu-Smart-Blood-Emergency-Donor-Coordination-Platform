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
  AlertCircle,
  CheckCircle2,
  Lock,
  Send,
  SlidersHorizontal,
  Navigation,
  Map as MapIcon,
  X,
  Sparkles,
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [unitsRequired, setUnitsRequired] = useState(1);
  const [urgency, setUrgency] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [radius, setRadius] = useState<number>(25);

  const [donors, setDonors] = useState<any[]>([]);
  const [isRare, setIsRare] = useState(false);
  const [rarityMeta, setRarityMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await matchingApi.findDonors({
        bloodGroup,
        city: city || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
        urgency,
        maxRadiusKm: radius,
        limit: 30,
      });

      const data = res.data?.data;
      if (data && data.candidates) {
        setDonors(data.candidates);
        setIsRare(Boolean(data.isRareBloodGroup));
        setRarityMeta(data.rarityLevel ? { level: data.rarityLevel, desc: data.rarityDescription } : null);
      } else if (Array.isArray(data)) {
        setDonors(data);
        setIsRare(false);
        setRarityMeta(null);
      } else {
        setDonors([]);
        setIsRare(false);
      }
    } catch (err) {
      console.error(err);
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBlood = (donorId?: string) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/find-blood?bloodGroup=${bloodGroup}&city=${city}`)}`);
      return;
    }

    navigate(
      `/patient/create-request?bloodGroup=${bloodGroup}${donorId ? `&donorId=${donorId}` : ''}&city=${encodeURIComponent(
        city
      )}&units=${unitsRequired}&urgency=${urgency}`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider">
          <Search className="w-3.5 h-3.5" />
          {t('findBlood')}
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {t('findBloodTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          {t('findBloodSubtitle')}
        </p>
      </div>

      {/* Filter / Search Box */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Blood Group */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('patientBloodGroup')}
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-rose-700 bg-slate-50 focus:bg-white"
              >
                <option value="O_NEGATIVE">O- (Universal RBC Donor)</option>
                <option value="O_POSITIVE">O+</option>
                <option value="A_POSITIVE">A+</option>
                <option value="A_NEGATIVE">A-</option>
                <option value="B_POSITIVE">B+</option>
                <option value="B_NEGATIVE">B-</option>
                <option value="AB_POSITIVE">AB+ (Universal Recipient)</option>
                <option value="AB_NEGATIVE">AB-</option>
                <option value="BOMBAY_PHENOTYPE">Bombay Blood Group (hh)</option>
                <option value="RH_NULL">Rh-null Blood Group</option>
              </select>
            </div>

            {/* City / Location */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('locationCity')}
                </label>
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                >
                  <Navigation className={`w-3 h-3 ${locating ? 'animate-spin' : ''}`} />
                  {locating ? 'GPS...' : coords ? 'GPS Active' : 'Use GPS'}
                </button>
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={coords ? 'GPS coordinates active' : 'e.g. Hyderabad, Mumbai'}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Units Required */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('unitsRequired')}
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={unitsRequired}
                onChange={(e) => setUnitsRequired(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('urgency')}
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold text-slate-800 bg-slate-50 focus:bg-white"
              >
                <option value="NORMAL">{t('normal')}</option>
                <option value="HIGH">{t('high')}</option>
                <option value="CRITICAL">{t('critical')}</option>
              </select>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Search Radius
              </label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 font-medium bg-slate-50 focus:bg-white"
              >
                <option value={5}>Within 5 km</option>
                <option value={7}>Within 7 km</option>
                <option value={9}>Within 9 km</option>
                <option value={10}>Within 10 km</option>
                <option value={15}>Within 15 km</option>
                <option value={20}>Within 20 km</option>
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
                <option value={100}>Within 100 km</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t('privacyNotice')}</span>
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {hasSearched && (
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 touch-target cursor-pointer"
                >
                  <MapIcon className="w-4 h-4 text-slate-500" />
                  <span>{showMap ? t('closeMap') : t('viewMap')}</span>
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer touch-target"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? t('loading') : t('searchAvailableBlood')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Map Drawer on Tablet/Mobile if triggered */}
      {showMap && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-3 px-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapIcon className="w-4 h-4 text-rose-600" />
              Regional Perimeter Map ({radius} km)
            </h3>
            <button
              onClick={() => setShowMap(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="h-64 sm:h-80 bg-slate-100 rounded-2xl flex items-center justify-center border border-dashed border-slate-300 text-xs text-slate-500">
            Perimeter centered around {city || 'your area'} ({radius} km safety zone).
          </div>
        </div>
      )}

      {/* INITIAL STATE: Before user performs a search */}
      {!hasSearched ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center max-w-lg mx-auto space-y-3 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <SlidersHorizontal className="w-7 h-7" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t('findBloodInitialPrompt')}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Select your blood group, city or district, and emergency urgency above, then click{' '}
            <strong className="text-rose-600">"{t('searchAvailableBlood')}"</strong>.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
              <Lock className="w-3 h-3 text-slate-400" />
              Zero donor records exposed prior to explicit search
            </span>
          </div>
        </div>
      ) : loading ? (
        /* Loading Skeleton */
        <div className="space-y-3">
          <div className="h-5 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-2xl bg-white border border-slate-200 animate-pulse p-4" />
            ))}
          </div>
        </div>
      ) : (
        /* AFTER SEARCH STATE */
        <div className="space-y-4">
          {/* Rare Blood Confidentiality Banner */}
          {isRare && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-bold">Confidential Rare Blood Matching</h4>
                <p className="text-amber-700 mt-0.5">
                  This blood type is classified as {rarityMeta?.level || 'RARE'}. In compliance with clinical privacy laws, exact donor markers and coordinates are safeguarded.
                </p>
              </div>
            </div>
          )}

          {/* Aggregate Count Banner */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {t('donorsFoundSummary', { count: donors.length, radius })}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Filtered by compatibility ({bloodGroup}), proximity, and mobile verification status.
              </p>
            </div>

            <Link
              to={`/patient/create-request?bloodGroup=${bloodGroup}&city=${encodeURIComponent(
                city
              )}&units=${unitsRequired}&urgency=${urgency}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors touch-target"
            >
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{t('broadcastRequest')}</span>
            </Link>
          </div>

          {/* Privacy-Preserved Donor Cards */}
          {donors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {donors.map((d, idx) => (
                <div
                  key={d.donorId || d.matchReference || idx}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    {/* Header: Verified Donor Badge & Blood Group */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 uppercase tracking-wider">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {t('verifiedDonor')}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{d.regionLabel || (d.city ? `${d.city}, ${d.state}` : 'Local District')}</span>
                          <span className="font-semibold text-rose-600">
                            • {d.distanceBand || t('approxDistance', { distance: `${radius} km` })}
                          </span>
                        </div>
                      </div>
                      <BloodGroupBadge bloodGroup={d.bloodGroup || bloodGroup} size="sm" />
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{t('availableForEmergency')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Request Blood Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-400">
                      {d.matchReference || `DONOR #${idx + 1}`}
                    </span>

                    <button
                      onClick={() => handleRequestBlood(d.donorId)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer touch-target"
                    >
                      <Send className="w-3 h-3" />
                      <span>{t('requestBlood')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 text-center max-w-md mx-auto space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{t('noDonorsFound')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('noDonorsFoundDesc', { radius })}
              </p>
              <Link
                to={`/patient/create-request?bloodGroup=${bloodGroup}&city=${encodeURIComponent(
                  city
                )}&units=${unitsRequired}&urgency=${urgency}`}
                className="inline-block px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-xs hover:bg-rose-700"
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
