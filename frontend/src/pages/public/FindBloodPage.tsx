import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { matchingApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import {
  Search,
  MapPin,
  ShieldCheck,
  Phone,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const FindBloodPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialGroup = searchParams.get('bloodGroup') || 'O_POSITIVE';
  const initialCity = searchParams.get('city') || '';

  const [bloodGroup, setBloodGroup] = useState(initialGroup);
  const [city, setCity] = useState(initialCity);
  const [urgency, setUrgency] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [radius, setRadius] = useState<number>(50);
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchDonors = async () => {
    setLoading(true);
    setSearched(true);
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

  useEffect(() => {
    fetchDonors();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDonors();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
          <Search className="w-3.5 h-3.5" />
          Real-Time Donor Discovery
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Find Compatible Blood Donors
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Search verified, eligible blood donors in your area. Contact details remain masked until
          an emergency request is created and accepted to protect donor privacy.
        </p>
      </div>

      {/* Filter Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Patient Blood Group
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              City / District
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="e.g. New Delhi, Noida"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Search Radius
            </label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
            >
              <option value={10}>Within 10 km</option>
              <option value={25}>Within 25 km</option>
              <option value={50}>Within 50 km</option>
              <option value={100}>Within 100 km</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Searching...' : 'Apply Filters'}
          </button>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Compatible Donor Candidates ({donors.length})
          </h2>
          <p className="text-xs text-slate-500">
            Ranked by RBC blood compatibility, location proximity, and eligibility intervals.
          </p>
        </div>

        <Link
          to={`/patient/create-request?bloodGroup=${bloodGroup}&city=${encodeURIComponent(city)}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
        >
          <AlertCircle className="w-4 h-4 text-rose-400" />
          Broadcast Emergency Request
        </Link>
      </div>

      {/* Donor Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse p-6"
            />
          ))}
        </div>
      ) : donors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {donors.map((d) => (
            <div
              key={d.donorId}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{d.fullName}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {d.city}, {d.state}
                      {d.distanceKm !== null && (
                        <span className="font-semibold text-rose-600">
                          ({d.distanceKm} km away)
                        </span>
                      )}
                    </div>
                  </div>
                  <BloodGroupBadge bloodGroup={d.bloodGroup} />
                </div>

                <div className="flex flex-wrap gap-2 text-xs pt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Eligible
                  </span>
                  {d.emergencyAvailable && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                      <Sparkles className="w-3.5 h-3.5" />
                      Emergency Ready
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                    {d.totalDonations} Donations
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-400 block">Match Quality</span>
                  <span className="font-bold text-slate-800">{d.score}% Score</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {d.maskedPhone}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Direct Donors Found</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            We could not find active voluntary donors within {radius}km of your query. Submit an
            Emergency Blood Request to notify hospitals, blood banks, and volunteers across nearby
            districts.
          </p>
          <Link
            to={`/patient/create-request?bloodGroup=${bloodGroup}&city=${encodeURIComponent(city)}`}
            className="inline-block px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow hover:bg-rose-700"
          >
            Create Emergency Request
          </Link>
        </div>
      )}
    </div>
  );
};
