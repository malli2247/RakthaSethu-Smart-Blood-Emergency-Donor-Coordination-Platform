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
  Building2,
  ArrowRight,
  Search,
  Activity,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
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
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto">
      {/* ============================================================ */}
      {/* 1. TOP WELCOME */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-rose-600 to-red-700 rounded-3xl p-5 sm:p-7 text-white shadow-md shadow-rose-900/10">
        <h1 className="text-xl sm:text-2xl font-black">
          {t('welcomeBack')}, {user?.displayName || 'Patient / Attendant'}
        </h1>
        <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-xl">
          Coordinate emergency blood requisitions, track volunteer response, and monitor verified fulfillment.
        </p>
      </div>

      {/* ============================================================ */}
      {/* 2. PRIMARY ACTIONS (Mobile-First Dominant Focus) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/find-blood"
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between group touch-target"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('findBlood')}</h3>
              <p className="text-xs text-slate-500">Search compatible voluntary donors in district</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/patient/create-request"
          className="p-4 sm:p-5 rounded-3xl bg-white border border-rose-300 hover:border-rose-500 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between group touch-target ring-1 ring-rose-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                {t('createEmergencyRequest')}
              </h3>
              <p className="text-xs text-slate-500">Broadcast urgent hospital requisition immediately</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* ============================================================ */}
      {/* 3. ACTIVE REQUESTS LIST */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            {t('activeRequests')} ({requests.length})
          </h2>
          {requests.length > 0 && (
            <span className="text-xs text-slate-400">Real-time status</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : requests.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {requests.map((r) => (
              <div
                key={r.id}
                className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <BloodGroupBadge bloodGroup={r.bloodGroup} size="sm" />
                    <UrgencyBadge urgency={r.urgency} />
                    <StatusBadge status={r.status} />
                    <span className="text-xs font-bold text-slate-700">
                      {r.unitsRequired} Unit{r.unitsRequired > 1 ? 's' : ''}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    Patient: {r.patientName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {r.hospitalName}, {r.hospitalCity}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Link
                    to={`/emergency/search/${r.id}`}
                    className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 touch-target"
                  >
                    <span>Track Search</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to={`/patient/requests/${r.id}`}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs touch-target flex items-center justify-center"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-bold text-slate-800">{t('noActiveRequests')}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Create an emergency request when blood is required for a patient.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
