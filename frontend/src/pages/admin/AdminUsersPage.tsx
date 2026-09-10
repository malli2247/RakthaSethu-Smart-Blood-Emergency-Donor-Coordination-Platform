import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Users, Search, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await adminApi.getUsers({
        role: roleFilter || undefined,
        search: search || undefined,
      });
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, { isActive: !currentActive });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">User Registry & Role Management</h1>
          <p className="text-xs text-slate-500">
            View all registered platform members, toggle active access, and monitor roles.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
          >
            <option value="">All Roles</option>
            <option value="DONOR">Donors</option>
            <option value="PATIENT">Patients</option>
            <option value="HOSPITAL">Hospitals</option>
            <option value="BLOOD_BANK">Blood Banks</option>
            <option value="VOLUNTEER">Volunteers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Location / Facility</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const facilityName =
                  u.donorProfile?.fullName ||
                  u.hospitalProfile?.name ||
                  u.bloodBankProfile?.name ||
                  u.email;

                const location =
                  u.donorProfile?.city ||
                  u.hospitalProfile?.city ||
                  u.bloodBankProfile?.city ||
                  'N/A';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{facilityName}</span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-mono">{u.phone || 'N/A'}</td>
                    <td className="p-4 text-slate-600">{location}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {u.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-600" /> Deactivated
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleActive(u.id, u.isActive)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          u.isActive
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
