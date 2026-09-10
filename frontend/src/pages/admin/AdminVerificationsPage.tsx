import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { ShieldCheck, Building2, Droplets, Check, X, CheckCircle2 } from 'lucide-react';

export const AdminVerificationsPage: React.FC = () => {
  const [verifications, setVerifications] = useState<any>({ hospitals: [], bloodBanks: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchVerifications = async () => {
    try {
      const res = await adminApi.getVerifications();
      setVerifications(res.data?.data || { hospitals: [], bloodBanks: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleVerify = async (type: 'hospital' | 'blood-bank', id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await adminApi.verifyOrg(type, id, { status, notes: `Reviewed by Admin on ${new Date().toLocaleDateString()}` });
      setMessage(`Organization verification status updated to: ${status}`);
      fetchVerifications();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Verification update failed');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Clinical Organization Verification Queue</h1>
        <p className="text-xs text-slate-500">
          Review legal licenses and authorize elevated blood request and inventory permissions.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {/* Hospitals Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          Pending Hospitals ({verifications.hospitals?.length || 0})
        </h2>

        {verifications.hospitals?.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {verifications.hospitals.map((h: any) => (
              <div key={h.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">{h.name}</h3>
                  <p className="text-xs text-slate-500">
                    License: <strong className="font-mono text-indigo-700">{h.licenseNumber}</strong> • {h.address}, {h.city}, {h.state}
                  </p>
                  <p className="text-xs text-slate-600">
                    Contact: {h.contactPerson} ({h.contactPhone})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerify('hospital', h.id, 'VERIFIED')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Approve License
                  </button>
                  <button
                    onClick={() => handleVerify('hospital', h.id, 'REJECTED')}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No hospitals currently pending verification.</p>
        )}
      </div>

      {/* Blood Banks Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-purple-600" />
          Pending Blood Banks ({verifications.bloodBanks?.length || 0})
        </h2>

        {verifications.bloodBanks?.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {verifications.bloodBanks.map((bb: any) => (
              <div key={bb.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">{bb.name}</h3>
                  <p className="text-xs text-slate-500">
                    License: <strong className="font-mono text-purple-700">{bb.licenseNumber}</strong> • Capacity: {bb.storageCapacity} Units
                  </p>
                  <p className="text-xs text-slate-600">
                    Contact: {bb.contactPerson} ({bb.contactPhone})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerify('blood-bank', bb.id, 'VERIFIED')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Approve License
                  </button>
                  <button
                    onClick={() => handleVerify('blood-bank', bb.id, 'REJECTED')}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No blood banks currently pending verification.</p>
        )}
      </div>
    </div>
  );
};
