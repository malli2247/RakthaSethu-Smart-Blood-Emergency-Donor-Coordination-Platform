import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { StatCard } from '../../components/StatCard';
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
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [verifications, setVerifications] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.getVerifications()])
      .then(([statsRes, verifRes]) => {
        setStats(statsRes.data?.data);
        setVerifications(verifRes.data?.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const chartData = [
    { name: 'Total Requests', count: stats?.totalRequests || 0 },
    { name: 'Critical Emergencies', count: stats?.criticalRequests || 0 },
    { name: 'Fulfilled Requests', count: stats?.fulfilledRequests || 0 },
    { name: 'Active Donors', count: stats?.activeDonors || 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/30 text-rose-400 text-xs font-bold uppercase border border-rose-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            RakthaSethu Platform Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            System Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            System-wide analytics, user registries, hospital verifications, and emergency metrics.
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
          title="Partner Facilities"
          value={(stats?.totalHospitals || 0) + (stats?.totalBloodBanks || 0)}
          subtitle={`${stats?.totalHospitals || 0} Hospitals • ${stats?.totalBloodBanks || 0} Banks`}
          icon={<Building2 className="w-5 h-5" />}
          color="purple"
        />
      </div>

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
