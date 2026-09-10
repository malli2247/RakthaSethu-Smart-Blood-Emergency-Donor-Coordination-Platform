import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hospitalApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { StatCard } from '../../components/StatCard';
import {
  Building2,
  AlertCircle,
  Heart,
  FilePlus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Award,
} from 'lucide-react';

export const HospitalDashboard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([hospitalApi.getProfile(), hospitalApi.getRequests()])
      .then(([profRes, reqRes]) => {
        setProfile(profRes.data?.data);
        setRequests(reqRes.data?.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalRequests = requests.length;
  const fulfilledCount = requests.filter((r) => r.status === 'FULFILLED').length;
  const activeCount = requests.filter((r) => !['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(r.status)).length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Hospital Portal
            </span>
            {profile?.verificationStatus === 'VERIFIED' ? (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Clinical Partner
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Verification Pending
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {profile?.name || 'Hospital Clinical Hub'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {profile?.address}, {profile?.city}, {profile?.state} • License: {profile?.licenseNumber}
          </p>
        </div>

        <Link
          to="/patient/create-request"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-200 transition-colors"
        >
          <FilePlus className="w-4 h-4" />
          Request Blood for Patient
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Requests"
          value={activeCount}
          subtitle="Currently matching or in progress"
          icon={<AlertCircle className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Total Fulfilled"
          value={fulfilledCount}
          subtitle="Transfusions verified"
          icon={<Heart className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Total Lifetime Requests"
          value={totalRequests}
          subtitle="Patient requisition forms"
          icon={<Building2 className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* Hospital's Requests */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Patient Emergency Requests</h2>
            <p className="text-xs text-slate-500">
              Active blood broadcasts originated by your hospital staff.
            </p>
          </div>
          <Link
            to="/hospital/requests"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
          >
            Manage All Requests
          </Link>
        </div>

        {requests.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {requests.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <BloodGroupBadge bloodGroup={r.bloodGroup} size="sm" />
                    <UrgencyBadge urgency={r.urgency} />
                    <StatusBadge status={r.status} />
                    <span className="text-xs font-bold text-slate-800">
                      {r.patientName} ({r.unitsRequired} Units)
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Needed by: {new Date(r.requiredBy).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span>Matched Donors: {r.matches?.length || 0}</span>
                  </div>
                </div>

                <Link
                  to={`/patient/requests/${r.id}`}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  View Details & Confirm
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No Patient Requests Created Yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Click the button above to broadcast an emergency request for any admitted patient.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
