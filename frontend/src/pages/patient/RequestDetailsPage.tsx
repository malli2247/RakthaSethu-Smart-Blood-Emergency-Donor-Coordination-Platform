import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { requestsApi, matchingApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { RequestLifecycleTimeline } from '../../components/requests/RequestLifecycleTimeline';
import {
  AlertCircle,
  Building2,
  Clock,
  Phone,
  CheckCircle2,
  MapPin,
  Activity,
  ArrowLeft,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';

export const RequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueNotes, setIssueNotes] = useState('');

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const [reqRes, matchRes] = await Promise.all([
        requestsApi.getById(id),
        matchingApi.getRequestMatches(id),
      ]);
      setRequest(reqRes.data?.data);
      setMatches(matchRes.data?.data?.matches || reqRes.data?.data?.matches || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 8000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCancelRequest = async () => {
    if (!id || !window.confirm('Are you sure you want to cancel this emergency request?')) return;
    try {
      await requestsApi.updateStatus(id, { status: 'CANCELLED', notes: 'Cancelled by requester' });
      setMessage('Request marked as Cancelled');
      fetchDetails();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  // Section 13 & 14: Receiver confirms blood received
  const handleConfirmBloodReceived = async () => {
    if (!id) return;
    setSubmittingAction(true);
    try {
      await requestsApi.confirmReceipt(id, {
        action: 'CONFIRM',
        notes: 'Recipient confirmed blood received safely',
      });
      setMessage('Thank you! Blood receipt confirmed.');
      await fetchDetails();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to confirm receipt');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Section 17: Receiver reports blood not received
  const handleReportProblem = async () => {
    if (!id || !issueNotes.trim()) return;
    setSubmittingAction(true);
    try {
      await requestsApi.confirmReceipt(id, {
        action: 'NOT_RECEIVED',
        reportedIssue: issueNotes.trim(),
      });
      setMessage('Issue reported. Hospital staff and Admin have been alerted.');
      setShowIssueModal(false);
      setIssueNotes('');
      await fetchDetails();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return <div className="h-64 bg-white rounded-3xl animate-pulse" />;
  }

  if (!request) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-900">Blood Request Not Found</h2>
        <Link to="/patient/dashboard" className="text-xs font-bold text-rose-600 hover:underline">
          Back to My Requests
        </Link>
      </div>
    );
  }

  const isReceiptConfirmed = request.receipts?.some((r: any) => r.confirmed);
  const isFulfilled = request.status === 'FULFILLED';
  const isDonationConfirmed = ['DONATION_CONFIRMED', 'DONATION_COMPLETED', 'BLOOD_RECEIVED', 'PARTIALLY_FULFILLED'].includes(request.status);
  const isIssueActive = request.status === 'FULFILLMENT_ISSUE';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back nav & status banner */}
      <div className="flex items-center justify-between">
        <Link
          to="/patient/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Requests
        </Link>

        {request.status !== 'FULFILLED' && request.status !== 'CANCELLED' && (
          <button
            onClick={handleCancelRequest}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            Cancel Request
          </button>
        )}
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {/* Main Request Summary Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BloodGroupBadge bloodGroup={request.bloodGroup} />
              <UrgencyBadge urgency={request.urgency} />
              <StatusBadge status={request.status} />
              {request.unitsFulfilled !== undefined && request.unitsFulfilled > 0 && (
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {request.unitsFulfilled} / {request.unitsRequired} Units Secured
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              Request for {request.patientName} ({request.unitsRequired} Unit{request.unitsRequired > 1 ? 's' : ''})
            </h1>
            <p className="text-xs text-slate-500">
              Broadcasted on {new Date(request.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/emergency/search/${request.id}`}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Emergency Search Live
            </Link>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs border-t border-slate-100 pt-4">
          <div className="space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Hospital Venue</span>
            <p className="font-bold text-slate-900 text-sm">{request.hospitalName}</p>
            <p className="text-slate-500">
              {request.hospitalAddress}, {request.hospitalCity}, {request.hospitalState}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Deadline / Urgency</span>
            <p className="font-bold text-slate-900 text-sm">
              Needed by {new Date(request.requiredBy).toLocaleString()}
            </p>
            {request.medicalReason && (
              <p className="text-slate-600 italic">"{request.medicalReason}"</p>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Attendant Contact</span>
            <p className="font-bold text-slate-900 text-sm">{request.contactName}</p>
            <p className="text-slate-500">{request.contactPhone}</p>
          </div>
        </div>
      </div>

      {/* Section 13, 14, 15, 16, 17: Interactive Receiver Blood Receipt Confirmation Box */}
      {isDonationConfirmed && !isFulfilled && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1 flex-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                Action Required: Recipient Receipt Confirmation
              </span>
              <h2 className="text-lg font-black text-slate-900">Has the patient received the blood units?</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hospital staff verified voluntary donor collection. To protect medical safety and officially fulfill this request, please confirm when the blood units have been safely delivered/received.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleConfirmBloodReceived}
              disabled={submittingAction || isReceiptConfirmed}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black text-xs shadow-sm flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isReceiptConfirmed ? 'Receipt Confirmed' : 'YES, BLOOD RECEIVED'}
            </button>

            <button
              onClick={() => setShowIssueModal(true)}
              disabled={submittingAction}
              className="px-4 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              NO / NOT YET — REPORT A PROBLEM
            </button>
          </div>
        </div>
      )}

      {/* Fulfillment Issue Active Warning Banner */}
      {isIssueActive && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Fulfillment Investigation Active
          </div>
          <p className="text-xs text-amber-700">
            A discrepancy was recorded regarding blood unit delivery. Hospital management and platform administrators have been dispatched to investigate and resolve this request.
          </p>
        </div>
      )}

      {/* Section 24, 37, 59: Centralized Visual Lifecycle Timeline */}
      <RequestLifecycleTimeline requestId={request.id} currentStatus={request.status} />

      {/* Matched Donors Section with Section 5 Privacy Enforcement */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Matched Donor Candidates ({matches.length})
            </h2>
            <p className="text-xs text-slate-500">
              Compatible voluntary donors contacted in the hospital's vicinity.
            </p>
          </div>
          <div className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
            Live Updates Active
          </div>
        </div>

        {matches.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {matches.map((m: any) => {
              const isAccepted = ['ACCEPTED', 'TRAVELLING', 'ARRIVED', 'DONATION_STARTED', 'DONATION_COMPLETED', 'CONFIRMED'].includes(m.status);

              return (
                <div
                  key={m.id || m.matchId}
                  className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {m.donor?.fullName || m.fullName || 'Matched Donor'}
                      </span>
                      <BloodGroupBadge bloodGroup={m.donor?.bloodGroup || m.bloodGroup} size="sm" />
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {m.compatibilityScore || m.score || 95}% Match
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {m.donor?.city || m.city || 'Nearby'}
                        {m.distanceKm !== null && m.distanceKm !== undefined && ` (${m.distanceKm} km)`}
                      </span>
                      <span>
                        Status: <strong className="text-slate-800 font-bold">{m.status.replace(/_/g, ' ')}</strong>
                      </span>
                    </div>

                    {isAccepted ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-3 mt-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <strong>Donor Agreed to Donate!</strong>
                          <p className="text-xs text-emerald-800 mt-0.5">
                            Donor status: <span className="font-black">{m.status.replace(/_/g, ' ')}</span>
                          </p>
                          {/* Section 5: Show phone only if not hidden by donor */}
                          {m.donor?.user?.phone && !m.donor?.hidePhoneNumber && (
                            <div className="font-bold text-slate-900 text-xs mt-1 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-emerald-700" />
                              Contact: <a href={`tel:${m.donor.user.phone}`} className="underline text-emerald-700">{m.donor.user.phone}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Candidate donor contacted. Details unlocked upon donor acceptance.
                      </p>
                    )}
                  </div>

                  <div className="self-end sm:self-center">
                    <StatusBadge status={m.status} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-spin" />
            <p className="text-sm font-bold text-slate-800">Contacting Nearby Donors...</p>
            <p className="text-xs text-slate-500 mt-1">
              Matching engine is dispatching alerts to donors of compatible blood groups.
            </p>
          </div>
        )}
      </div>

      {/* Problem Report Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">Report Blood Delivery Issue</h3>
            </div>
            <p className="text-xs text-slate-600">
              Please specify the issue encountered (e.g., blood units not delivered, wrong blood group, hospital delay). This will halt premature fulfillment and alert administrators.
            </p>
            <textarea
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReportProblem}
                disabled={submittingAction || !issueNotes.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Submit Incident Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
