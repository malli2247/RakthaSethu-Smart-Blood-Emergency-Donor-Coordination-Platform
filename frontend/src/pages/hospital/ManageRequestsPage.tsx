import React, { useState, useEffect } from 'react';
import { hospitalApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { StatusBadge } from '../../components/StatusBadge';
import {
  CheckCircle2,
  Heart,
  AlertCircle,
  Clock,
  X,
  PlusCircle,
  Building2,
  Award,
} from 'lucide-react';

export const ManageRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedDonorId, setSelectedDonorId] = useState<string>('');
  const [units, setUnits] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await hospitalApi.getRequests();
      setRequests(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleConfirmDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !selectedDonorId) return;

    try {
      const res = await hospitalApi.confirmDonation({
        requestId: selectedRequest.id,
        donorId: selectedDonorId,
        units,
        notes,
      });

      setMessage(
        `Donation confirmed! Certificate generated: ${res.data?.data?.certificateCode}`
      );
      setSelectedRequest(null);
      setSelectedDonorId('');
      fetchRequests();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to confirm donation');
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Manage Hospital Requests & Verify Donations</h1>
        <p className="text-xs text-slate-500">
          Verify arriving voluntary donors, confirm units collected, and officially fulfill patient requests.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <BloodGroupBadge bloodGroup={r.bloodGroup} />
                  <UrgencyBadge urgency={r.urgency} />
                  <StatusBadge status={r.status} />
                  <span className="text-xs font-bold text-slate-700">
                    {r.unitsRequired} Units Required
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  Patient: {r.patientName} (Contact: {r.contactName} • {r.contactPhone})
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span>Needed by: {new Date(r.requiredBy).toLocaleString()}</span>
                  <span>Matched Donors: {r.matches?.length || 0}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                {r.status !== 'FULFILLED' && r.matches && r.matches.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedRequest(r);
                      setSelectedDonorId(r.matches[0]?.donor?.id || '');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                  >
                    <Heart className="w-4 h-4" />
                    Confirm Donor Arrival
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No Active Requests</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Donation for {selectedRequest.patientName}
              </h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDonation} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Select Arrived Donor *
                </label>
                <select
                  required
                  value={selectedDonorId}
                  onChange={(e) => setSelectedDonorId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">-- Select Matched Donor --</option>
                  {selectedRequest.matches?.map((m: any) => (
                    <option key={m.donor?.id} value={m.donor?.id}>
                      {m.donor?.fullName} ({m.donor?.bloodGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Units Successfully Collected *
                </label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  required
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Clinical Verification Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cross-matching completed, units verified healthy."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-colors"
              >
                Confirm Donation & Issue Certificate
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
