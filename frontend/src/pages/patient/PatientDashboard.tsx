import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { StatusBadge } from '../../components/StatusBadge';
import {
  FilePlus,
  AlertCircle,
  Clock,
  MapPin,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await requestsApi.list({ requesterId: user?.id });
      setRequests(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.id]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold uppercase">
            <AlertCircle className="w-3.5 h-3.5" />
            Patient & Emergency Requester Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Emergency Blood Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track active emergency broadcasts, view matched donors, and update clinical status.
          </p>
        </div>

        <Link
          to="/patient/create-request"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-200 transition-colors shrink-0"
        >
          <FilePlus className="w-4 h-4" />
          Create Blood Request
        </Link>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Your Blood Requests ({requests.length})</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : requests.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {requests.map((r) => (
              <div
                key={r.id}
                className="py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <BloodGroupBadge bloodGroup={r.bloodGroup} />
                    <UrgencyBadge urgency={r.urgency} />
                    <StatusBadge status={r.status} />
                    <span className="text-xs font-bold text-slate-700">
                      {r.unitsRequired} Unit{r.unitsRequired > 1 ? 's' : ''} Needed
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    Patient: {r.patientName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {r.hospitalName}, {r.hospitalCity}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Needed by: {new Date(r.requiredBy).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-rose-600">
                      <Users className="w-3.5 h-3.5" />
                      {r._count?.matches || 0} Donors Notified
                    </span>
                  </div>
                </div>

                <Link
                  to={`/patient/requests/${r.id}`}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm self-end md:self-center"
                >
                  <span>View Matches & Progress</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Blood Requests Created Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              If you or a family member needs blood, create an emergency broadcast to reach nearby
              compatible donors.
            </p>
            <Link
              to="/patient/create-request"
              className="inline-block px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow hover:bg-rose-700"
            >
              Create First Request
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
