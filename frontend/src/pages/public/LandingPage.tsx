import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('B_POSITIVE');
  const [searchCity, setSearchCity] = useState('');

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/find-blood?bloodGroup=${selectedBloodGroup}&city=${encodeURIComponent(searchCity)}`);
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-50/70 via-white to-slate-50 pt-16 pb-20 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100/80 border border-rose-200 text-rose-800 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                24/7 Real-Time Emergency Network
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Bridging Hearts,{' '}
                <span className="text-rose-600 underline decoration-rose-300 decoration-wavy">
                  Saving Lives
                </span>{' '}
                Every Second.
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
                RakthaSethu connects voluntary blood donors, patients in critical emergencies,
                hospitals, and certified blood banks instantly through smart geo-matching.
              </p>

              {/* Major CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/patient/create-request"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200 hover:shadow-xl transition-all"
                >
                  <AlertCircle className="w-5 h-5 animate-bounce" />
                  Need Blood Now
                </Link>
                <Link
                  to="/register?role=DONOR"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 shadow-sm transition-all"
                >
                  <Heart className="w-5 h-5 text-rose-600 fill-rose-500" />
                  Become a Donor
                </Link>
              </div>

              {/* Trust badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Verified Donors Only
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-600" />
                  Average Match: &lt; 3 mins
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Zero Platform Fee
                </span>
              </div>
            </div>

            {/* Right Quick Search Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 relative">
                <div className="absolute -top-3 right-6 bg-rose-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow">
                  Instant Discovery
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Search className="w-5 h-5 text-rose-600" />
                  Quick Donor Search
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Check available donors and blood compatibility in your city immediately.
                </p>

                <form onSubmit={handleQuickSearch} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                          className={`py-2 text-xs font-black rounded-lg border transition-all ${
                            selectedBloodGroup === bg
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {bg.replace('_POSITIVE', '+').replace('_NEGATIVE', '-')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Location / City
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. New Delhi, Mumbai, Bengaluru"
                        value={searchCity}
                        onChange={(e) => setSearchCity(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow transition-colors"
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

      {/* Impact Statistics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-3xl sm:text-4xl font-black text-rose-600">12,500+</span>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
              Registered Donors
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-3xl sm:text-4xl font-black text-emerald-600">4,890+</span>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
              Emergencies Fulfilled
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-3xl sm:text-4xl font-black text-blue-600">320+</span>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
              Network Hospitals
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-3xl sm:text-4xl font-black text-purple-600">&lt; 3 mins</span>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
              Average Match Speed
            </p>
          </div>
        </div>
      </section>

      {/* How RakthaSethu Works Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            How RakthaSethu Saves Lives
          </h2>
          <p className="text-slate-600 mt-2">
            A seamless, reliable technology pipeline that turns desperation into relief.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-lg border border-rose-200">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900">Post Emergency Request</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Patient family or attending doctor submits the required blood group, urgency level,
              and hospital location in under 60 seconds.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-200">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900">Smart Donor Geo-Match</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Our matching engine evaluates blood compatibility, distance, availability, and
              donation intervals to alert the most qualified nearby donors.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg border border-emerald-200">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900">Direct Connect & Fulfillment</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              When a donor accepts, contact details are unlocked. The hospital confirms the
              successful donation and generates an official certificate.
            </p>
          </div>
        </div>
      </section>

      {/* Call to action card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-3xl bg-gradient-to-r from-rose-600 to-red-700 p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-rose-200">
          <div className="space-y-3 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-black">
              Are you ready to become someone's superhero?
            </h3>
            <p className="text-rose-100 max-w-xl text-sm sm:text-base">
              A single blood donation takes 15 minutes and can save up to 3 human lives. Register as
              a voluntary donor today.
            </p>
          </div>
          <Link
            to="/register?role=DONOR"
            className="px-8 py-4 rounded-xl bg-white text-rose-700 font-extrabold hover:bg-rose-50 shadow-lg whitespace-nowrap transition-colors"
          >
            Register in 2 Minutes
          </Link>
        </div>
      </section>
    </div>
  );
};
