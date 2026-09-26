import React, { useState, useEffect, useCallback } from 'react';
import { campApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { BloodDonationCamp } from '../../types';
import { CampsMap } from '../../components/camps/CampsMap';
import {
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Navigation,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Map as MapIcon,
  LayoutGrid,
  Locate,
  X,
  Building2,
  Phone,
  Info,
  ChevronRight,
} from 'lucide-react';

const MAJOR_INDIAN_CITIES = [
  'All Locations',
  'Delhi',
  'Bangalore',
  'Mumbai',
  'Chennai',
  'Hyderabad',
  'Kolkata',
  'Pune',
  'Dehradun',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Kochi',
  'Bhopal',
  'Indore',
  'Patna',
  'Bhubaneswar',
  'Visakhapatnam',
];

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export const CampaignsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Camp listings state
  const [camps, setCamps] = useState<BloodDonationCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');

  // Location & Filter state
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('All Locations');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState<number>(25);

  // Modals & User Feedback
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [customCityInput, setCustomCityInput] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Camp Creation Form State
  const [formData, setFormData] = useState({
    campName: '',
    venue: '',
    address: '',
    city: '',
    district: '',
    state: '',
    campDate: '',
    startTime: '09:00',
    endTime: '16:00',
    organizerName: '',
    contactPhone: '',
    contactEmail: '',
    registrationUrl: '',
    description: '',
  });
  const [submittingCamp, setSubmittingCamp] = useState(false);

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // Fetch verified camps from authoritative backend
  const fetchCamps = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        radius: radiusKm,
        expand: true,
        status: 'UPCOMING',
      };

      if (userCoords) {
        params.lat = userCoords.lat;
        params.lon = userCoords.lon;
      } else if (selectedCity && selectedCity !== 'All Locations') {
        params.city = selectedCity;
      }

      const res = await campApi.list(params);
      setCamps(res.data?.data || []);
      setMeta(res.data?.meta || null);
    } catch (err: any) {
      console.error('[CampaignsPage] Error loading camps:', err);
      showNotification('Failed to load verified donation camps.', 'error');
    } finally {
      setLoading(false);
    }
  }, [userCoords, selectedCity, radiusKm]);

  useEffect(() => {
    fetchCamps();
  }, [fetchCamps]);

  // Handle browser device geolocation
  const handleUseDeviceLocation = () => {
    if (!('geolocation' in navigator)) {
      showNotification('Geolocation is not supported by your browser.', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserCoords({ lat, lon });
        setSelectedCity('');
        setLocationLabel(`GPS Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
        setIsLocationModalOpen(false);
        showNotification('Acquired device location. Finding nearby verified camps...', 'success');
      },
      (err) => {
        console.warn('Geolocation denied or unavailable:', err);
        showNotification('Location access denied. Please select your city manually.', 'info');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  // Handle manual city selection
  const handleSelectCity = (city: string) => {
    if (city === 'All Locations') {
      setUserCoords(null);
      setSelectedCity('');
      setLocationLabel('All Locations');
    } else {
      setUserCoords(null);
      setSelectedCity(city);
      setLocationLabel(city);
    }
    setIsLocationModalOpen(false);
  };

  // Handle Donor Registration
  const handleRegister = async (campId: string, isRegistered?: boolean) => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/campaigns`;
      return;
    }

    try {
      if (isRegistered) {
        await campApi.cancel(campId);
        showNotification('Registration cancelled successfully.', 'info');
      } else {
        await campApi.register(campId);
        showNotification('Successfully registered for verified blood donation camp! Thank you for saving lives.', 'success');
      }
      fetchCamps();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Action failed. Please try again.', 'error');
    }
  };

  // Handle Camp Creation Submission
  const handleCreateCampSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCamp(true);
    try {
      const res = await campApi.create(formData);
      const isVerified = res.data?.data?.verificationStatus === 'VERIFIED';
      showNotification(
        isVerified
          ? 'Camp published directly to the public verified directory!'
          : 'Camp submitted! It will appear publicly once verified by RakthaSethu Administrators.',
        'success'
      );
      setIsOrganizeModalOpen(false);
      setFormData({
        campName: '',
        venue: '',
        address: '',
        city: '',
        district: '',
        state: '',
        campDate: '',
        startTime: '09:00',
        endTime: '16:00',
        organizerName: '',
        contactPhone: '',
        contactEmail: '',
        registrationUrl: '',
        description: '',
      });
      fetchCamps();
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Failed to submit camp.', 'error');
    } finally {
      setSubmittingCamp(false);
    }
  };

  const canOrganize =
    isAuthenticated &&
    ['HOSPITAL', 'BLOOD_BANK', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold max-w-xl mx-auto shadow-md border animate-in fade-in slide-in-from-top-4 duration-300 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : message.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-white via-rose-50/30 to-slate-50 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              Real-Time Authoritative Directory • Zero Fake Data
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Nearby Blood Donation Camps
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Find authenticated voluntary blood drives synchronized with official healthcare portals
              like e-RaktKosh (Ministry of Health & Family Welfare) and accredited hospital networks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canOrganize && (
              <button
                onClick={() => setIsOrganizeModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Organize a Camp
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center gap-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                Map View
              </button>
            </div>
          </div>
        </div>

        {/* Location & Radius Control Bar */}
        <div className="pt-6 border-t border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Active Location Selection */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Your Location:</span>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>{locationLabel}</span>
            </div>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 underline underline-offset-2"
            >
              Change Location
            </button>
            <button
              onClick={handleUseDeviceLocation}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Locate via device GPS"
            >
              <Locate className="w-3 h-3 text-slate-500" />
              Use GPS
            </button>
          </div>

          {/* Configurable Radius Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0">Radius:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  radiusKm === r
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                Within {r} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transparent Radius Expansion Alert Banner (Section 3) */}
      {meta?.expanded && meta.expansionMessage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{meta.expansionMessage}</span>
          </div>
          <button
            onClick={() => setRadiusKm(100)}
            className="text-xs font-bold text-amber-800 underline hover:text-amber-900 shrink-0"
          >
            Expand to 100 km
          </button>
        </div>
      )}

      {/* Content Rendering: Cards vs Map */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-72 rounded-3xl bg-white border border-slate-200 p-6 space-y-4" />
          ))}
        </div>
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          <CampsMap
            camps={camps}
            userLat={userCoords?.lat}
            userLon={userCoords?.lon}
            radiusKm={meta?.radiusKm || radiusKm}
            height="560px"
          />
        </div>
      ) : camps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {camps.map((camp) => {
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              `${camp.venue}, ${camp.address}, ${camp.city}`
            )}`;

            return (
              <div
                key={camp.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Source & Status Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                        camp.source === 'E_RAKTKOSH'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}
                    >
                      {camp.source === 'E_RAKTKOSH' ? 'e-RaktKosh Verified' : 'RakthaSethu Verified'}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        camp.status === 'TODAY' || camp.status === 'ONGOING'
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>

                  {/* Title & Timing */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">{camp.campName}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Organized by <strong className="text-slate-700">{camp.organizerName}</strong>
                      {camp.bloodBankName && (
                        <span> • In partnership with {camp.bloodBankName}</span>
                      )}
                    </p>
                  </div>

                  {/* Date, Time & Venue */}
                  <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {new Date(camp.campDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        {camp.startTime} – {camp.endTime}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        <span className="font-semibold text-slate-800 block">{camp.venue}</span>
                        <span className="text-slate-500 text-[11px] block">{camp.address}</span>
                      </div>
                    </div>

                    {camp.distanceKm !== null && camp.distanceKm !== undefined && (
                      <div className="flex items-center gap-2 pt-1 text-slate-700 font-bold">
                        <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>
                          {camp.distanceKm} km away{' '}
                          {camp.isCityApproximate && (
                            <span className="text-[10px] font-normal text-amber-600">(City area)</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions & Footer */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {camp.lastFetchedAt
                        ? `Last verified: ${new Date(camp.lastFetchedAt).toLocaleDateString()}`
                        : 'Official Healthcare Source'}
                    </span>
                    {camp.sourceUrl && (
                      <a
                        href={camp.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
                      >
                        View Source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRegister(camp.id, camp.isRegistered)}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs shadow-2xs transition-colors ${
                        camp.isRegistered
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                    >
                      {camp.isRegistered ? 'Registered ✓ (Cancel)' : 'Register to Donate'}
                    </button>

                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                      title="Get driving / walking directions in Google Maps"
                    >
                      <Navigation className="w-4 h-4 text-slate-600" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Zero-Data State (Section 10) */
        <div className="bg-white rounded-3xl p-12 text-center max-w-lg mx-auto border border-slate-200 shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            No verified blood donation camps found near your location.
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Try expanding your search radius or selecting another location. RakthaSethu never fabricates
            fake camps to fill empty listings.
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setRadiusKm(100);
                showNotification('Expanded search radius to 100 km.', 'info');
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Expand Search to 100 km
            </button>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Change Location
            </button>
          </div>
        </div>
      )}

      {/* Location Picker Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Select Location</h3>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* GPS Locate Button */}
            <button
              onClick={handleUseDeviceLocation}
              className="w-full p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <Locate className="w-4 h-4 text-rose-600" />
              Use Current Device Location (GPS)
            </button>

            {/* Custom City Search Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Search City or District</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Pune, Dehradun, Lucknow..."
                  value={customCityInput}
                  onChange={(e) => setCustomCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customCityInput.trim()) {
                      handleSelectCity(customCityInput.trim());
                    }
                  }}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Major Indian Cities List */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Major Cities</label>
              <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-2 gap-2">
                {MAJOR_INDIAN_CITIES.filter((c) =>
                  c.toLowerCase().includes(customCityInput.toLowerCase())
                ).map((city) => (
                  <button
                    key={city}
                    onClick={() => handleSelectCity(city)}
                    className="p-2.5 rounded-xl text-left text-xs font-semibold hover:bg-slate-100 text-slate-700 border border-slate-100 transition-colors truncate"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleSelectCity('All Locations')}
                className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Clear Location Filter (Show All Verified Camps)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organize a Blood Donation Camp Modal (Hospitals & Blood Banks) */}
      {isOrganizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Organize a Blood Donation Camp</h3>
                <p className="text-xs text-slate-500">
                  Published after verification by RakthaSethu administrative review.
                </p>
              </div>
              <button
                onClick={() => setIsOrganizeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Camp / Drive Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo Lifesaver Mega Blood Drive 2026"
                  value={formData.campName}
                  onChange={(e) => setFormData({ ...formData, campName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Venue *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Town Hall / Hospital Campus"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Organizer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rotary Club / Apollo Hospital"
                    value={formData.organizerName}
                    onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123 MG Road, Sector 4"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bangalore"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karnataka"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Camp Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.campDate}
                    onChange={(e) => setFormData({ ...formData, campDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Contact Email</label>
                  <input
                    type="email"
                    placeholder="organizer@hospital.org"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOrganizeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCamp}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
                >
                  {submittingCamp ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
