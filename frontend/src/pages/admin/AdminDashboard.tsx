import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Heart,
  Droplets,
  Users,
  Building2,
  Package,
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Server,
  Bell,
  Cpu,
  Radio,
  Send,
  Sliders,
  Check,
  X,
  AlertCircle,
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
    { name: 'Total Requests', count: stats?.totalRequests ?? 0 },
    { name: 'Critical Emergencies', count: stats?.criticalRequests ?? 0 },
    { name: 'Fulfilled', count: stats?.fulfilledRequests ?? 0 },
    { name: 'Active Donors', count: stats?.activeDonors ?? 0 },
  ];

  const pendingOrgCount =
    (verifications?.hospitals?.length || 0) + (verifications?.bloodBanks?.length || 0);

  const totalStuckCount =
    (stuckAlerts?.delayedDonors?.length || 0) +
    (stuckAlerts?.delayedArrivals?.length || 0) +
    (stuckAlerts?.pendingReceipts?.length || 0) +
    (stuckAlerts?.fulfillmentIssues?.length || 0);

  const actionRequiredCount = pendingOrgCount + totalStuckCount;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Overview Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/30 text-rose-400 text-xs font-bold uppercase border border-rose-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('adminCommandCenter')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Platform Operations Command</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            {t('adminSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/admin/verifications"
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            Verifications ({pendingOrgCount})
          </Link>
          <Link
            to="/admin/users"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
          >
            {t('userDirectory')}
          </Link>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {/* 2. Primary Database-Driven KPI Grid (Zero-data safe) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Emergencies */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('activeEmergencies')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {stats?.activeEmergencies ?? 0}
          </div>
          <span className="text-[11px] text-rose-600 font-bold mt-1 block">
            {stats?.criticalRequests ?? 0} Critical / {stats?.urgentRequests ?? 0} Urgent
          </span>
        </div>

        {/* Requests Matching */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('requestsMatching')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {stats?.matchingRequests ?? 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Algorithmic radius search active
          </span>
        </div>

        {/* Available Donors */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('availableDonors')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {stats?.activeDonors ?? 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Of {stats?.totalDonors ?? 0} total registered donors
          </span>
        </div>

        {/* Verified Facilities */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Verified Facilities
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {(stats?.verifiedHospitals ?? 0) + (stats?.verifiedBloodBanks ?? 0)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {stats?.verifiedHospitals ?? 0} Hospitals • {stats?.verifiedBloodBanks ?? 0} Blood Banks
          </span>
        </div>
      </div>

      {/* 3. Action Required Center (Only displays if action is actually needed) */}
      {actionRequiredCount > 0 ? (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-black">
                {t('actionRequired')}: {actionRequiredCount} Operational Item(s) Pending Review
              </h2>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
              Requires Admin Action
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Facility Verifications Pending */}
            {pendingOrgCount > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-amber-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {pendingOrgCount} Facility Verification(s) Pending
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {verifications?.hospitals?.length || 0} Hospital(s), {verifications?.bloodBanks?.length || 0} Blood Bank(s) awaiting audit.
                  </p>
                </div>
                <Link
                  to="/admin/verifications"
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0"
                >
                  Review
                </Link>
              </div>
            )}

            {/* Stalled Operations */}
            {totalStuckCount > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-amber-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {totalStuckCount} Stalled Blood Request(s)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requests with delayed donor arrivals or unconfirmed completions.
                  </p>
                </div>
                <a
                  href="#stuck-requests"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0"
                >
                  Inspect
                </a>
              </div>
            )}
          </div>

          {/* Stalled Request Triage List */}
          {totalStuckCount > 0 && (
            <div id="stuck-requests" className="divide-y divide-amber-200/60 bg-white rounded-2xl border border-amber-200 overflow-hidden mt-4">
              {[
                ...(stuckAlerts?.delayedDonors || []),
                ...(stuckAlerts?.delayedArrivals || []),
                ...(stuckAlerts?.pendingReceipts || []),
                ...(stuckAlerts?.fulfillmentIssues || []),
              ].map((r: any) => (
                <div
                  key={r.id}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        #{r.id.substring(0, 8).toUpperCase()} • {r.patientName}
                      </span>
                      <BloodGroupBadge bloodGroup={r.bloodGroup} size="sm" />
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-amber-700 font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {r.alertMessage || 'Procedure requires administrative triage'}
                    </p>
                    <div className="text-[11px] text-slate-500">
                      Hospital: {r.hospitalName} ({r.hospitalCity})
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                    <Link
                      to={`/coordination/${r.id}`}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      Room <ExternalLink className="w-3 h-3" />
                    </Link>
                    <button
                      onClick={() => handleResolve(r.id, 'RESTART_MATCHING')}
                      disabled={resolvingId === r.id}
                      className="px-3 py-1.5 border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold"
                    >
                      Rematch
                    </button>
                    <button
                      onClick={() => handleResolve(r.id, 'FORCE_FULFILL')}
                      disabled={resolvingId === r.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                    >
                      Force Fulfill
                    </button>
                    <button
                      onClick={() => handleResolve(r.id, 'CANCEL')}
                      disabled={resolvingId === r.id}
                      className="px-2.5 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>All operational queues clear. No pending administrative interventions required at this time.</span>
        </div>
      )}

      {/* 4. Live Emergency Operations Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('liveEmergencyOperations')}</h2>
            <p className="text-xs text-slate-500">
              Real-time feed of active patient blood requisitions across regions.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
            {liveEmergencies.length} Active Records
          </span>
        </div>

        {liveEmergencies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Donors (Found / Accepted)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveEmergencies.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{req.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4">
                      <BloodGroupBadge bloodGroup={req.bloodGroup} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {req.unitsRequired} Unit(s)
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-semibold text-slate-800">{req.hospitalName}</div>
                      <div className="text-[11px] text-slate-400">{req.hospitalCity}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          req.urgency === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : req.urgency === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.urgency}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {req.suitableDonors} found • {req.acceptedDonors} accepted
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/coordination/${req.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px]"
                      >
                        Room <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-sm font-bold text-slate-800">No Active Emergencies in Database</p>
            <p className="text-xs text-slate-500 mt-0.5">
              New patient requests will appear in real time via live Server-Sent Events.
            </p>
          </div>
        )}
      </div>

      {/* 5. Platform Activity Visual & Approvals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recharts Bar Visual */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Platform Activity Telemetry</h2>
              <p className="text-xs text-slate-500">Live counts directly aggregated from SQLite database.</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {stats?.fulfillmentRate ?? 0}% Fulfillment Rate
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#e11d48" radius={[8, 8, 0, 0]} barSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Verifications Widget */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('pendingVerifications')}</h2>
            <p className="text-xs text-slate-500">
              Accreditation reviews for medical facilities.
            </p>

            <div className="space-y-3 mt-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Pending Hospitals</span>
                  <span className="text-[11px] text-slate-500">Medical license audit</span>
                </div>
                <span className="text-xl font-black text-rose-600">
                  {verifications?.hospitals?.length || 0}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Pending Blood Banks</span>
                  <span className="text-[11px] text-slate-500">Cold-chain certification</span>
                </div>
                <span className="text-xl font-black text-purple-600">
                  {verifications?.bloodBanks?.length || 0}
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/admin/verifications"
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center shadow transition-colors block"
          >
            Open Accreditation Queue
          </Link>
        </div>
      </div>

      {/* 6. System Health Monitoring Checks (#70) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">{t('systemHealth')}</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Updated {systemHealth?.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString() : 'Just now'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {/* Database */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Database</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-black text-emerald-700">
              {systemHealth?.database?.status || 'Healthy'}
            </div>
            <span className="text-[10px] text-slate-500">
              Latency: {systemHealth?.database?.latencyMs ?? 1} ms
            </span>
          </div>

          {/* Authentication */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Authentication</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-black text-emerald-700">
              {systemHealth?.auth?.status || 'Healthy'}
            </div>
            <span className="text-[10px] text-slate-500">JWT & RBAC Active</span>
          </div>

          {/* SSE Real-time Feed */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">SSE Notification</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-black text-emerald-700">
              {systemHealth?.notificationService?.status || 'Healthy'}
            </div>
            <span className="text-[10px] text-slate-500">
              {systemHealth?.notificationService?.activeStreams ?? 1} Active Streams
            </span>
          </div>

          {/* SMS Service */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">SMS Gateway</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-black text-slate-800">
              {systemHealth?.smsService?.status || 'Safe Mode'}
            </div>
            <span className="text-[10px] text-slate-500">Resilient Delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
};
