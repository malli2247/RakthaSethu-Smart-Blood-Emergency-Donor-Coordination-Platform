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
  Navigation,
  MapPin,
  HeartHandshake,
  FileCheck,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

export const ManageRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Verification & Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    request: any;
    donor: any;
    units: number;
    notes: string;
  } | null>(null);

  // Issue modal state
  const [issueModal, setIssueModal] = useState<{
    requestId: string;
    donorId?: string;
    issueReason: string;
  } | null>(null);

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
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleVerifyArrival = async (requestId: string, donorId: string) => {
    setActionLoading(`${requestId}-${donorId}`);
    try {
      await hospitalApi.verifyArrival({
        requestId,
        donorId,
        staffNotes: 'Donor physical arrival verified at reception',
      });
      setMessage('Donor arrival verified successfully');
      await fetchRequests();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to verify arrival');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartDonation = async (requestId: string, donorId: string) => {
    setActionLoading(`${requestId}-${donorId}`);
    try {
      await hospitalApi.startDonation({ requestId, donorId, units: 1 });
      setMessage('Donation procedure started');
      await fetchRequests();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to start donation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteDonation = async (requestId: string, donorId: string) => {
    setActionLoading(`${requestId}-${donorId}`);
    try {
      await hospitalApi.completeDonation({ requestId, donorId });
      setMessage('Blood collection complete. Ready for official confirmation.');
      await fetchRequests();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to complete donation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmModal) return;

    setActionLoading(`${confirmModal.request.id}-${confirmModal.donor.id}`);
    try {
      const res = await hospitalApi.confirmDonation({
        requestId: confirmModal.request.id,
        donorId: confirmModal.donor.id,
        units: confirmModal.units,
        notes: confirmModal.notes,
      });

      setMessage(`Donation verified! Certificate Code: ${res.data?.data?.certificateCode || 'Generated'}`);
      setConfirmModal(null);
      await fetchRequests();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to confirm donation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueModal || !issueModal.issueReason.trim()) return;

    try {
      await hospitalApi.reportIssue({
        requestId: issueModal.requestId,
        donorId: issueModal.donorId,
        issueReason: issueModal.issueReason.trim(),
      });
      setMessage('Issue recorded. Platform is searching for replacement donors.');
      setIssueModal(null);
      await fetchRequests();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to record issue');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Hospital Emergency Donation Control Panel</h1>
        <p className="text-xs text-slate-500">
          Verify donor arrival, manage medical donation collection, confirm blood units, and issue official certificates.
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
        <div className="space-y-6">
          {requests.map((r) => {
            const confirmedDonationsCount = r.donations?.filter((d: any) => d.status === 'CONFIRMED')?.reduce((sum: number, d: any) => sum + d.units, 0) || r.unitsFulfilled || 0;

            return (
              <div
                key={r.id}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6"
              >
                {/* Header Summary */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <BloodGroupBadge bloodGroup={r.bloodGroup} />
                      <UrgencyBadge urgency={r.urgency} />
                      <StatusBadge status={r.status} />
                      <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {confirmedDonationsCount} / {r.unitsRequired} Units Confirmed
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900">
                      Emergency #{r.id.substring(0, 8).toUpperCase()} • Patient: {r.patientName} (Contact: {r.contactName} • {r.contactPhone})
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span>Needed by: {new Date(r.requiredBy).toLocaleString()}</span>
                      <span>Total Matched Candidates: {r.matches?.length || 0}</span>
                    </div>
                  </div>

                  <a
                    href={`/coordination/${r.id}`}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    Open Coordination Room
                  </a>
                </div>

                {/* Section 25 & 26: Matched Donors Operational Control Panel */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Matched Donors Operational State Machine
                  </h4>

                  {r.matches && r.matches.length > 0 ? (
                    <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                      {r.matches.map((m: any) => {
                        const donor = m.donor;
                        const donorKey = `${r.id}-${donor.id}`;
                        const isActionActive = actionLoading === donorKey;

                        return (
                          <div
                            key={m.id}
                            className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{donor.fullName}</span>
                                <BloodGroupBadge bloodGroup={donor.bloodGroup} size="sm" />
                                <StatusBadge status={m.status} />
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>City: {donor.city}</span>
                                {donor.user?.phone && (
                                  <span>Phone: <a href={`tel:${donor.user.phone}`} className="underline text-slate-700">{donor.user.phone}</a></span>
                                )}
                              </div>
                            </div>

                            {/* State Specific Controls */}
                            <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                              {/* 1. Accepted or Travelling: Hospital can verify arrival */}
                              {(m.status === 'ACCEPTED' || m.status === 'TRAVELLING') && (
                                <button
                                  onClick={() => handleVerifyArrival(r.id, donor.id)}
                                  disabled={isActionActive}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  VERIFY ARRIVAL
                                </button>
                              )}

                              {/* 2. Arrived: Start Donation Procedure */}
                              {m.status === 'ARRIVED' && (
                                <button
                                  onClick={() => handleStartDonation(r.id, donor.id)}
                                  disabled={isActionActive}
                                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                                >
                                  <HeartHandshake className="w-3.5 h-3.5" />
                                  START DONATION
                                </button>
                              )}

                              {/* 3. Donation Started: Done — Complete Donation */}
                              {m.status === 'DONATION_STARTED' && (
                                <button
                                  onClick={() => handleCompleteDonation(r.id, donor.id)}
                                  disabled={isActionActive}
                                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 animate-pulse"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  DONE — DONATION COMPLETED
                                </button>
                              )}

                              {/* 4. Donation Completed: Confirm & Certify */}
                              {(m.status === 'DONATION_COMPLETED' || m.status === 'DONATION_VERIFICATION_PENDING') && (
                                <button
                                  onClick={() =>
                                    setConfirmModal({
                                      request: r,
                                      donor,
                                      units: 1,
                                      notes: `Donation verified by hospital staff for patient ${r.patientName}`,
                                    })
                                  }
                                  disabled={isActionActive}
                                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  CONFIRM & CERTIFY
                                </button>
                              )}

                              {/* Confirmed */}
                              {m.status === 'CONFIRMED' && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Donation Verified
                                </span>
                              )}

                              {/* Report Issue Button */}
                              {m.status !== 'CONFIRMED' && m.status !== 'DECLINED' && (
                                <button
                                  onClick={() =>
                                    setIssueModal({
                                      requestId: r.id,
                                      donorId: donor.id,
                                      issueReason: 'Donor deferred due to low hemoglobin / medical screening',
                                    })
                                  }
                                  className="px-2.5 py-1.5 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                                >
                                  Report Issue
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-center">
                      No candidate donors matched yet. Matching engine is expanding radius.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No Active Requests for Your Facility</p>
        </div>
      )}

      {/* Confirmation & Certification Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleConfirmDonationSubmit}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-cyan-700">
              <Award className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">Verify & Certify Blood Donation</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Confirm medical donation for <strong>{confirmModal.donor.fullName}</strong> ({confirmModal.donor.bloodGroup}). This issues an official tamper-evident certificate and updates donor records.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Units Collected</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={confirmModal.units}
                  onChange={(e) =>
                    setConfirmModal({ ...confirmModal, units: parseInt(e.target.value) || 1 })
                  }
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl mt-1 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Hospital Medical Notes</label>
                <textarea
                  value={confirmModal.notes}
                  onChange={(e) =>
                    setConfirmModal({ ...confirmModal, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl mt-1 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Donation & Issue Certificate
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hospital Issue Modal */}
      {issueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleReportIssueSubmit}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">Hospital Medical Report / Deferral</h3>
            </div>
            <p className="text-xs text-slate-600">
              If a donor was unable to donate due to medical deferral, no-show, or test failure, recording it will trigger the matching engine to locate replacement donors immediately.
            </p>

            <textarea
              value={issueModal.issueReason}
              onChange={(e) => setIssueModal({ ...issueModal, issueReason: e.target.value })}
              rows={3}
              placeholder="Reason for deferral or issue..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIssueModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Submit Report & Re-match
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
