import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { ResponsiveTable, Column } from '../../components/common/ResponsiveTable';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ShieldCheck,
  AlertTriangle,
  Heart,
  Building2,
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Server,
  Calendar,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [verifications, setVerifications] = useState<any>(null);
  const [stuckAlerts, setStuckAlerts] = useState<any>(null);
  const [liveEmergencies, setLiveEmergencies] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      const [statsRes, verifRes, stuckRes, emergRes, healthRes] = await Promise.allSettled([
        adminApi.getStats(),
        adminApi.getVerifications(),
        adminApi.getStuckRequests(),
        adminApi.getLiveEmergencies(),
        adminApi.getSystemHealth(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data);
      if (verifRes.status === 'fulfilled') setVerifications(verifRes.value.data?.data);
      if (stuckRes.status === 'fulfilled') setStuckAlerts(stuckRes.value.data?.data);
      if (emergRes.status === 'fulfilled') setLiveEmergencies(emergRes.value.data?.data || []);
      if (healthRes.status === 'fulfilled') setSystemHealth(healthRes.value.data?.data);
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (
    requestId: string,
    action: 'FORCE_FULFILL' | 'RESTART_MATCHING' | 'CANCEL'
  ) => {
    setResolvingId(requestId);
    try {
      await adminApi.resolveRequest(requestId, {
        action,
        notes: `Admin intervention: ${action}`,
      });
      setMessage(`Request resolution applied: ${action}`);
      await loadDashboardData();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Resolution failed');
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setResolvingId(null);
    }
  };

  const chartData = [
    { name: 'Requests', count: stats?.totalRequests ?? 0 },
    { name: 'Critical', count: stats?.criticalRequests ?? 0 },
    { name: 'Fulfilled', count: stats?.fulfilledRequests ?? 0 },
    { name: 'Donors', count: stats?.activeDonors ?? 0 },
  ];

  const pendingOrgCount =
    (verifications?.hospitals?.length || 0) + (verifications?.bloodBanks?.length || 0);

  const totalStuckCount =
    (stuckAlerts?.delayedDonors?.length || 0) +
    (stuckAlerts?.delayedArrivals?.length || 0) +
    (stuckAlerts?.pendingReceipts?.length || 0) +
    (stuckAlerts?.fulfillmentIssues?.length || 0);

  const actionRequiredCount = pendingOrgCount + totalStuckCount;

  const emergencyColumns: Column<any>[] = [
    {
      header: 'Request',
      accessor: (r) => (
        <span className="font-mono font-bold text-slate-900">
          #{r.id.substring(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Blood Group',
      accessor: (r) => <BloodGroupBadge bloodGroup={r.bloodGroup} size="sm" />,
    },
    {
      header: 'Units',
      accessor: (r) => `${r.unitsRequired} Unit(s)`,
    },
    {
      header: 'Facility',
      accessor: (r) => (
        <div>
          <div className="font-semibold text-slate-900">{r.hospitalName}</div>
          <div className="text-[11px] text-slate-400">{r.hospitalCity}</div>
        </div>
      ),
    },
    {
      header: 'Urgency',
      accessor: (r) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
            r.urgency === 'CRITICAL'
              ? 'bg-rose-100 text-rose-800'
              : r.urgency === 'HIGH'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {r.urgency}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Actions',
      accessor: (r) => (
        <Link
          to={`/coordination/${r.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px]"
        >
          Room <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* 1. Header & Overview Banner */}
      <div className="bg-slate-900 rounded-3xl p-5 sm:p-7 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-600/30 text-rose-400 text-[11px] font-bold uppercase border border-rose-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('commandCenter')}
          </div>
          <h1 className="text-xl sm:text-2xl font-black">Platform Operations Command</h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            {t('adminSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={loadDashboardData}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer touch-target"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>
          <Link
            to="/admin/verifications"
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors touch-target flex items-center"
          >
            Verifications ({pendingOrgCount})
          </Link>
          <Link
            to="/admin/camps"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-1.5 touch-target"
          >
            <Calendar className="w-3.5 h-3.5 text-rose-400" />
            <span>Camps</span>
          </Link>
          <Link
            to="/admin/users"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors touch-target flex items-center"
          >
            <span>{t('userDirectory')}</span>
          </Link>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* 2. Primary KPI Grid (Responsive 2 cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Emergencies */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t('activeEmergencies')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
            {stats?.activeEmergencies ?? 0}
          </div>
          <span className="text-[10px] text-rose-600 font-bold mt-1 block">
            {stats?.criticalRequests ?? 0} Critical
          </span>
        </div>

        {/* Requests Matching */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t('requestsMatching')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Radio className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
            {stats?.matchingRequests ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block truncate">
            Radius search active
          </span>
        </div>

        {/* Available Donors */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t('availableDonors')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
            {stats?.activeDonors ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block truncate">
            Of {stats?.totalDonors ?? 0} registered
          </span>
        </div>

        {/* Verified Facilities */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Verified Facilities
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
            {(stats?.verifiedHospitals ?? 0) + (stats?.verifiedBloodBanks ?? 0)}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block truncate">
            {stats?.verifiedHospitals ?? 0} H • {stats?.verifiedBloodBanks ?? 0} BB
          </span>
        </div>
      </div>

      {/* 3. Action Required Center (Only displays if action is actually needed) */}
      {actionRequiredCount > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 sm:p-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h2 className="text-xs sm:text-sm font-black">
                {t('actionRequired')}: {actionRequiredCount} Item(s) Pending Review
              </h2>
            </div>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Attention
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingOrgCount > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-amber-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {pendingOrgCount} Facility Verification(s)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hospitals & blood banks awaiting accreditation audit.
                  </p>
                </div>
                <Link
                  to="/admin/verifications"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 touch-target flex items-center"
                >
                  Review
                </Link>
              </div>
            )}

            {totalStuckCount > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-amber-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {totalStuckCount} Stalled Blood Request(s)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Delayed donor arrivals or unconfirmed completions.
                  </p>
                </div>
                <a
                  href="#stuck-requests"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 touch-target flex items-center"
                >
                  Inspect
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Live Emergency Operations (Using ResponsiveTable: table on desktop, cards on mobile) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">{t('liveEmergencyOperations')}</h2>
            <p className="text-xs text-slate-500">Real-time patient requisitions across regions</p>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {liveEmergencies.length} Active
          </span>
        </div>

        <ResponsiveTable
          columns={emergencyColumns}
          data={liveEmergencies}
          keyExtractor={(item) => item.id}
          renderMobileCard={(r) => (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    #{r.id.substring(0, 8).toUpperCase()}
                  </span>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">
                    {r.hospitalName} ({r.hospitalCity})
                  </div>
                </div>
                <BloodGroupBadge bloodGroup={r.bloodGroup} size="sm" />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">{r.unitsRequired} Unit(s)</span>
                  <StatusBadge status={r.status} />
                </div>
                <Link
                  to={`/coordination/${r.id}`}
                  className="px-3 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center gap-1"
                >
                  Room <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
          emptyState={
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs sm:text-sm font-bold text-slate-800">No Active Emergencies in Database</p>
              <p className="text-xs text-slate-500 mt-0.5">New requisitions will appear automatically.</p>
            </div>
          }
        />
      </div>

      {/* 5. Telemetry Chart & Verifications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Platform Telemetry</h2>
              <p className="text-xs text-slate-500">Live operational counts directly from database</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              {stats?.fulfillmentRate ?? 0}% Rate
            </span>
          </div>

          <div className="h-56 sm:h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="count" fill="#e11d48" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Verifications Widget */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">{t('pendingVerifications')}</h2>
            <p className="text-xs text-slate-500">Accreditation reviews for medical facilities</p>

            <div className="space-y-2.5 mt-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Hospitals</span>
                <span className="text-lg font-black text-rose-600">{verifications?.hospitals?.length || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Blood Banks</span>
                <span className="text-lg font-black text-purple-600">{verifications?.bloodBanks?.length || 0}</span>
              </div>
            </div>
          </div>

          <Link
            to="/admin/verifications"
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center shadow-xs transition-colors block mt-3"
          >
            Open Accreditation Queue
          </Link>
        </div>
      </div>

      {/* 6. System Health Monitoring */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">{t('systemHealth')}</h2>
          </div>
          <span className="text-[11px] font-bold text-emerald-600">All Systems Operational</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Database</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xs font-bold text-emerald-700">{systemHealth?.database?.status || 'Healthy'}</div>
            <span className="text-[10px] text-slate-500">{systemHealth?.database?.latencyMs ?? 1} ms</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Auth</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xs font-bold text-emerald-700">{systemHealth?.auth?.status || 'Healthy'}</div>
            <span className="text-[10px] text-slate-500">JWT & RBAC</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">SSE Feed</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xs font-bold text-emerald-700">{systemHealth?.notificationService?.status || 'Healthy'}</div>
            <span className="text-[10px] text-slate-500">Active Streams</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Push/SMS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xs font-bold text-slate-800">{systemHealth?.smsService?.status || 'Safe Mode'}</div>
            <span className="text-[10px] text-slate-500">Web Push Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
