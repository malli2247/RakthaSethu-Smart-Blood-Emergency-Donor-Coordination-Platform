import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import {
  Users,
  Heart,
  Droplets,
  AlertCircle,
  Building2,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  Play,
  Check,
  X,
  ExternalLink,
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
  const [stats, setStats] = useState<any>(null);
  const [verifications, setVerifications] = useState<any>(null);
  const [stuckAlerts, setStuckAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      const [statsRes, verifRes, stuckRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getVerifications(),
        adminApi.getStuckRequests(),
      ]);
      setStats(statsRes.data?.data);
      setVerifications(verifRes.data?.data);
      setStuckAlerts(stuckRes.data?.data);
    } catch (err) {
      console.error(err);
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
        notes: `Administrative command resolution: ${action}`,
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
    { name: 'Total Requests', count: stats?.totalRequests || 0 },
    { name: 'Critical Emergencies', count: stats?.criticalRequests || 0 },
    { name: 'Fulfilled Requests', count: stats?.fulfilledRequests || 0 },
    { name: 'Active Donors', count: stats?.activeDonors || 0 },
  ];

  const totalStuckCount =
    (stuckAlerts?.delayedDonors?.length || 0) +
    (stuckAlerts?.delayedArrivals?.length || 0) +
    (stuckAlerts?.pendingReceipts?.length || 0) +
    (stuckAlerts?.fulfillmentIssues?.length || 0);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/30 text-rose-400 text-xs font-bold uppercase border border-rose-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            RakthaSethu Platform Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">System Command Center</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            System-wide operational analytics, stuck request detectors, user registries, and medical verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/verifications"
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            Verification Queue (
            {(verifications?.hospitals?.length || 0) + (verifications?.bloodBanks?.length || 0)})
          </Link>
          <Link
            to="/admin/users"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
          >
            Manage Users
          </Link>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          subtitle="Registered accounts"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Active Blood Donors"
          value={stats?.activeDonors || 0}
          subtitle={`Total Donors: ${stats?.totalDonors || 0}`}
          icon={<Heart className="w-5 h-5" />}
          color="red"
        />
        <StatCard
          title="Emergency Fulfillment Rate"
          value={`${stats?.fulfillmentRate || 0}%`}
          subtitle={`${stats?.fulfilledRequests || 0} of ${stats?.totalRequests || 0} fulfilled`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Operational Bottlenecks"
          value={totalStuckCount}
          subtitle="Requests requiring triage"
          icon={<AlertTriangle className="w-5 h-5" />}
          color={totalStuckCount > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Section 30 & 31: Operational Stuck Requests & Bottleneck Detector */}
      {totalStuckCount > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-black">
                Operational Alert: {totalStuckCount} Stalled / Stuck Blood Requests Detected
              </h2>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
              Automated Triage Active
            </span>
          </div>
          <p className="text-xs text-amber-900/80">
            System monitored donors with delayed arrivals (&gt;60m), hospital donation procedures awaiting completion (&gt;45m), or recipients awaiting receipt confirmation (&gt;120m).
          </p>

          <div className="divide-y divide-amber-200/60 bg-white rounded-2xl border border-amber-200 overflow-hidden">
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
                    {r.alertMessage || 'Request delayed in lifecycle'}
                  </p>

                  <div className="text-[11px] text-slate-500">
                    Hospital: {r.hospitalName} ({r.hospitalCity}) • Contact: {r.contactName} ({r.contactPhone})
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                  <Link
                    to={`/coordination/${r.id}`}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    View Room <ExternalLink className="w-3 h-3" />
                  </Link>

                  <button
                    onClick={() => handleResolve(r.id, 'RESTART_MATCHING')}
                    disabled={resolvingId === r.id}
                    className="px-3 py-1.5 border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold"
                  >
                    Rematch Donors
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
        </div>
      )}

      {/* Analytics Chart & Pending Verifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recharts Bar Visual */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Platform Activity Overview</h2>
              <p className="text-xs text-slate-500">Live counts across core operational metrics.</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#e11d48" radius={[6, 6, 0, 0]} barSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Verifications Widget */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pending Approvals</h2>
            <p className="text-xs text-slate-500">
              Hospitals & Blood banks awaiting administrative license verification.
            </p>

            <div className="space-y-3 mt-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Pending Hospitals</span>
                  <span className="text-[11px] text-slate-500">Awaiting medical audit</span>
                </div>
                <span className="text-xl font-black text-rose-600">
                  {verifications?.hospitals?.length || 0}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Pending Blood Banks</span>
                  <span className="text-[11px] text-slate-500">Awaiting cold-chain audit</span>
                </div>
                <span className="text-xl font-black text-purple-600">
                  {verifications?.bloodBanks?.length || 0}
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/admin/verifications"
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center shadow transition-colors"
          >
            Review Verification Queue
          </Link>
        </div>
      </div>

      {/* Super Admin Control Modules */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/admin/command-center"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Emergency Command Center</h3>
          <p className="text-xs text-slate-500 mt-1">Live national triage, active emergency routes, and incident response feeds.</p>
        </Link>

        <Link
          to="/admin/simulator"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Emergency Simulator</h3>
          <p className="text-xs text-slate-500 mt-1">Simulate mass-casualty triage algorithms and test donor response models.</p>
        </Link>

        <Link
          to="/admin/users"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">User & Role Governance</h3>
          <p className="text-xs text-slate-500 mt-1">Audit accounts, manage RBAC privileges, inspect profiles, and control suspensions.</p>
        </Link>

        <Link
          to="/admin/verifications"
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Facility Accreditation</h3>
          <p className="text-xs text-slate-500 mt-1">Review official medical licenses and verify hospital & blood bank centers.</p>
        </Link>
      </div>
    </div>
  );
};
