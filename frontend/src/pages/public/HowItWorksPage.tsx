import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  AlertCircle,
  Building2,
  Users,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" />
          Transparent Lifesaving Pipeline
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          How RakthaSethu Works
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          A synchronized, secure ecosystem connecting people in crisis with willing donors,
          hospitals, and verified blood banks.
        </p>
      </div>

      {/* Role specific workflow cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* For Patients / Families */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">For Patients & Families</h2>
          <ul className="space-y-4 text-xs sm:text-sm text-slate-600">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Post Request:</strong> Provide patient details, hospital name, blood group,
                and emergency level (Normal, High, Critical).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Live Matching:</strong> The engine automatically scores and alerts compatible
                donors within your radius.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Direct Contact:</strong> Once a donor accepts, direct phone numbers and
                coordination channels are unlocked.
              </span>
            </li>
          </ul>
          <Link
            to="/patient/create-request"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700"
          >
            Create Emergency Request <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* For Blood Donors */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <Heart className="w-6 h-6 fill-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-slate-900">For Voluntary Donors</h2>
          <ul className="space-y-4 text-xs sm:text-sm text-slate-600">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Sign Up & Profile:</strong> Register with blood group, city, and toggle your
                availability and emergency readiness.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Receive Alerts:</strong> Receive targeted notifications when a patient nearby
                requires your exact or compatible blood.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Donate & Track Impact:</strong> After donation, the hospital confirms your
                units and generates a verified certificate.
              </span>
            </li>
          </ul>
          <Link
            to="/register?role=DONOR"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            Join as Donor <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* For Hospitals & Blood Banks */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">For Hospitals & Banks</h2>
          <ul className="space-y-4 text-xs sm:text-sm text-slate-600">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Verified Accounts:</strong> Hospitals and blood banks are verified by admins
                with license verification.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Inventory Management:</strong> Track blood units, expiration dates, and
                component types in real-time.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Donation Verification:</strong> Confirm arriving donors and record official
                blood units in 1 click.
              </span>
            </li>
          </ul>
          <Link
            to="/register?role=HOSPITAL"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
          >
            Register Facility <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
