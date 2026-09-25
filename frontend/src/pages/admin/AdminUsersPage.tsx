import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Eye,
  X,
  Building2,
  Heart,
  Droplets,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  Lock,
  RefreshCw,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, {
        isActive: !currentActive,
        reason: currentActive ? 'Suspended by Super Admin' : 'Reactivated by Super Admin',
      });
      setActionSuccess(`User account ${currentActive ? 'suspended' : 'activated'} successfully.`);
      setTimeout(() => setActionSuccess(null), 3000);
      fetchUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser((prev: any) => prev ? { ...prev, isActive: !currentActive } : null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleToggleVerify = async (userId: string, currentVerified: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, {
        isVerified: !currentVerified,
        reason: 'Verification updated by Super Admin',
      });
      setActionSuccess(`User verification status changed to ${!currentVerified ? 'VERIFIED' : 'UNVERIFIED'}.`);
      setTimeout(() => setActionSuccess(null), 3000);
      fetchUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser((prev: any) => prev ? { ...prev, isVerified: !currentVerified } : null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update verification status');
    }
  };

  const openUserDetails = async (user: any) => {
    setSelectedUser(user);
    setDetailLoading(true);
    try {
      const res = await adminApi.getUserById(user.id);
      if (res.data?.data) {
        setSelectedUser(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching full user profile:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'DONOR':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'HOSPITAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'BLOOD_BANK':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'PATIENT':
      case 'ATTENDANT':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'VOLUNTEER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-rose-600" />
            Super Admin User Registry & RBAC Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit user accounts, enforce role-based access, inspect credentials, and manage platform suspensions.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {actionSuccess}
        </div>
      )}

      {/* Safety Notice regarding Medical Records */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Medical Integrity Guardrail:</span> Administrators can manage accounts, roles, and verification status, but historical medical, donation, and cross-match records are strictly immutable.
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by email, phone, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="DONOR">Donors</option>
            <option value="PATIENT">Receivers / Patients</option>
            <option value="HOSPITAL">Hospitals</option>
            <option value="BLOOD_BANK">Blood Banks</option>
            <option value="VOLUNTEER">Volunteers</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended / Inactive</option>
            <option value="UNVERIFIED">Pending Verification</option>
            <option value="VERIFIED">Verified Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">User & Contact</th>
                <th className="p-4">Role</th>
                <th className="p-4">Location / Facility</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Account Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const displayName =
                    u.donorProfile?.fullName ||
                    u.patientProfile?.fullName ||
                    u.hospitalProfile?.name ||
                    u.bloodBankProfile?.name ||
                    u.volunteerProfile?.fullName ||
                    u.email.split('@')[0];

                  const location =
                    u.donorProfile?.city ||
                    u.patientProfile?.city ||
                    u.hospitalProfile?.city ||
                    u.bloodBankProfile?.city ||
                    u.volunteerProfile?.serviceAreaCity ||
                    '—';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{displayName}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{u.email}</span>
                          {u.phone && <span className="font-mono text-slate-500">({u.phone})</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black border ${getRoleBadge(
                            u.role
                          )}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{location}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleVerify(u.id, u.isVerified)}
                          title="Click to toggle verification"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                            u.isVerified
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {u.isVerified ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Verified
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Pending
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openUserDetails(u)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Inspect Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(u.id, u.isActive)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                              u.isActive
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {u.isActive ? 'Suspend' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details & Profile Inspector Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  {selectedUser.role.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">User Profile & Governance</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 block font-medium">Email Address</span>
                <span className="font-bold text-slate-800 break-all">{selectedUser.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Assigned Role</span>
                <span className={`inline-block px-2 py-0.5 rounded font-black text-[10px] border mt-0.5 ${getRoleBadge(selectedUser.role)}`}>
                  {selectedUser.role}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Phone Number</span>
                <span className="font-bold text-slate-800 font-mono">{selectedUser.phone || 'Not Provided'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Registered At</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Sub-profile Inspection */}
            {selectedUser.donorProfile && (
              <div className="border border-rose-100 bg-rose-50/40 p-4 rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-600" /> Donor Medical Profile
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>Full Name: <span className="font-bold">{selectedUser.donorProfile.fullName}</span></div>
                  <div>Blood Group: <span className="font-black text-rose-600">{selectedUser.donorProfile.bloodGroup}</span></div>
                  <div>Location: <span>{selectedUser.donorProfile.city}, {selectedUser.donorProfile.state}</span></div>
                  <div>Eligible: <span className="font-bold">{selectedUser.donorProfile.isEligible ? 'Yes' : 'No'}</span></div>
                </div>
              </div>
            )}

            {selectedUser.hospitalProfile && (
              <div className="border border-blue-100 bg-blue-50/40 p-4 rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" /> Hospital Facility Information
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>Facility Name: <span className="font-bold">{selectedUser.hospitalProfile.name}</span></div>
                  <div>License: <span className="font-mono font-bold">{selectedUser.hospitalProfile.licenseNumber}</span></div>
                  <div>Contact: <span>{selectedUser.hospitalProfile.contactPerson}</span></div>
                  <div>Status: <span className="font-bold text-blue-700">{selectedUser.hospitalProfile.verificationStatus}</span></div>
                </div>
              </div>
            )}

            {selectedUser.bloodBankProfile && (
              <div className="border border-amber-100 bg-amber-50/40 p-4 rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-amber-600" /> Blood Bank Storage Facility
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>Center Name: <span className="font-bold">{selectedUser.bloodBankProfile.name}</span></div>
                  <div>License: <span className="font-mono font-bold">{selectedUser.bloodBankProfile.licenseNumber}</span></div>
                  <div>Storage Capacity: <span className="font-bold">{selectedUser.bloodBankProfile.storageCapacity} Units</span></div>
                  <div>Status: <span className="font-bold text-amber-700">{selectedUser.bloodBankProfile.verificationStatus}</span></div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => handleToggleVerify(selectedUser.id, selectedUser.isVerified)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {selectedUser.isVerified ? 'Mark as Unverified' : 'Mark as Verified'}
              </button>

              <button
                onClick={() => handleToggleActive(selectedUser.id, selectedUser.isActive)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors ${
                  selectedUser.isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {selectedUser.isActive ? 'Suspend Account' : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
