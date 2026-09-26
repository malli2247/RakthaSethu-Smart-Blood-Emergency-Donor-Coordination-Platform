import React, { useState, useEffect } from 'react';
import { donorApi, requestsApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { StatusBadge } from '../../components/StatusBadge';
import {
  AlertCircle,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  X,
  Activity,
  Navigation,
  HeartHandshake,
  FileCheck,
  AlertTriangle,
  Building2,
  ExternalLink,
} from 'lucide-react';

export const DonorRequestsPage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cancellation modal state
  const [cancelModalMatchId, setCancelModalMatchId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Unexpected personal emergency');

  const fetchMatches = async () => {
    try {
      const res = await donorApi.getMatches();
      setMatches(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRespond = async (matchId: string, action: 'ACCEPT' | 'DECLINE') => {
    setActionLoading(matchId);
    try {
      await requestsApi.respondToMatch(matchId, action);
      setMessage(`Match status updated to: ${action}`);
      await fetchMatches();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Error responding to request');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartTravel = async (matchId: string, hospitalName: string, hospitalCity: string) => {
    setActionLoading(matchId);
    try {
      await requestsApi.startTravel(matchId);
      setMessage('Navigation started. Travel status broadcasted.');
      // Open Google Maps directions in new tab
      const dest = encodeURIComponent(`${hospitalName}, ${hospitalCity}`);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
      await fetchMatches();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to update travel status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkArrived = async (matchId: string) => {
    setActionLoading(matchId);
    try {
      await requestsApi.markArrived(matchId);
      setMessage('Hospital has been notified that you have arrived!');
      await fetchMatches();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to record arrival');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelMatch = async () => {
    if (!cancelModalMatchId) return;
    setActionLoading(cancelModalMatchId);
    try {
      await requestsApi.respondToMatch(cancelModalMatchId, 'CANCEL', cancelReason);
      setMessage('Participation cancelled. Matching engine notified to search replacement donors.');
      setCancelModalMatchId(null);
      await fetchMatches();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to cancel participation');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredMatches = matches.filter((m) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') {
      return ['ACCEPTED', 'TRAVELLING', 'ARRIVED', 'DONATION_STARTED', 'DONATION_COMPLETED'].includes(m.status);
    }
    return m.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Blood Requests Matching You</h1>
          <p className="text-xs text-slate-500">
            Emergency requests from patients and hospitals in your area where your blood can save a life.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl text-xs font-bold">
          {['ALL', 'NOTIFIED', 'ACTIVE', 'CONFIRMED', 'DECLINED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === st ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredMatches.length > 0 ? (
        <div className="space-y-4">
          {filteredMatches.map((m) => {
            const req = m.request;
            if (!req) return null;

            const isAccepted = m.status === 'ACCEPTED';
            const isTravelling = m.status === 'TRAVELLING';
            const isArrived = m.status === 'ARRIVED';
            const isDonationStarted = m.status === 'DONATION_STARTED';
            const isDonationCompleted = m.status === 'DONATION_COMPLETED';
            const isConfirmed = m.status === 'CONFIRMED';
            const isActiveParticipation = isAccepted || isTravelling || isArrived || isDonationStarted || isDonationCompleted;

            return (
              <div
                key={m.id}
                className={`bg-white rounded-3xl p-6 border shadow-sm space-y-4 transition-all ${
                  isActiveParticipation ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <BloodGroupBadge bloodGroup={req.bloodGroup} />
                      <UrgencyBadge urgency={req.urgency} />
                      <StatusBadge status={m.status} />
                      <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        Match Score: {m.compatibilityScore}%
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Patient: {req.patientName} ({req.unitsRequired} Unit{req.unitsRequired > 1 ? 's' : ''} Needed)
                      </h3>
                      {req.medicalReason && (
                        <p className="text-xs text-slate-600 italic mt-0.5">"{req.medicalReason}"</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {req.hospitalName}, {req.hospitalAddress}, {req.hospitalCity}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Required by: {new Date(req.requiredBy).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    {m.status === 'NOTIFIED' || m.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleRespond(m.id, 'ACCEPT')}
                          disabled={actionLoading === m.id}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
                        >
                          Accept Request
                        </button>
                        <button
                          onClick={() => handleRespond(m.id, 'DECLINE')}
                          disabled={actionLoading === m.id}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                        >
                          Decline
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Section 6 & 7: Comprehensive Donor Acceptance & Travel Action Panel */}
                {isActiveParticipation && (
                  <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                          Active Donation Commitment
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          Destination: {req.hospitalName} ({req.hospitalCity})
                        </h4>
                      </div>

                      {/* Coordination room shortcut */}
                      <a
                        href={`/coordination/${req.id}`}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-800"
                      >
                        Emergency Coordination Room <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Operational Progress Status */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className={`p-2 rounded-xl border ${isAccepted ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
                        1. Accepted
                      </div>
                      <div className={`p-2 rounded-xl border ${isTravelling ? 'bg-sky-50 border-sky-200 text-sky-700 font-bold animate-pulse' : isArrived || isDonationStarted || isDonationCompleted ? 'bg-white border-slate-200 text-slate-700 font-semibold' : 'bg-white border-slate-200 text-slate-400'}`}>
                        2. Travelling
                      </div>
                      <div className={`p-2 rounded-xl border ${isArrived ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : isDonationStarted || isDonationCompleted ? 'bg-white border-slate-200 text-slate-700 font-semibold' : 'bg-white border-slate-200 text-slate-400'}`}>
                        3. Arrived
                      </div>
                      <div className={`p-2 rounded-xl border ${isDonationStarted || isDonationCompleted ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold' : 'bg-white border-slate-200 text-slate-400'}`}>
                        4. Donation
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {isAccepted && (
                        <button
                          onClick={() => handleStartTravel(m.id, req.hospitalName, req.hospitalCity)}
                          disabled={actionLoading === m.id}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          START NAVIGATION
                        </button>
                      )}

                      {(isAccepted || isTravelling) && (
                        <button
                          onClick={() => handleMarkArrived(m.id)}
                          disabled={actionLoading === m.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          I HAVE ARRIVED
                        </button>
                      )}

                      {isArrived && (
                        <div className="px-3.5 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Arrival Recorded. Hospital staff will begin donation procedure shortly.
                        </div>
                      )}

                      {isDonationStarted && (
                        <div className="px-3.5 py-2 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                          <HeartHandshake className="w-4 h-4 text-rose-600" />
                          Donation procedure in progress.
                        </div>
                      )}

                      {isDonationCompleted && (
                        <div className="px-3.5 py-2 bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          Donation procedure completed. Awaiting hospital verification.
                        </div>
                      )}

                      <a
                        href={`tel:${req.contactPhone}`}
                        className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        Call Contact ({req.contactName})
                      </a>

                      {(isAccepted || isTravelling) && (
                        <button
                          onClick={() => setCancelModalMatchId(m.id)}
                          disabled={actionLoading === m.id}
                          className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold ml-auto"
                        >
                          CAN'T DONATE
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {isConfirmed && (
                  <div className="mt-2 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>
                        <strong>Donation Officially Confirmed!</strong> Thank you for your humanitarian gift.
                      </span>
                    </div>
                    <a
                      href="/donor/history"
                      className="text-xs font-bold text-emerald-700 underline hover:text-emerald-800"
                    >
                      View Certificate & History
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No Requests Found</p>
          <p className="text-xs text-slate-400 mt-1">
            There are currently no blood requests matching your filter.
          </p>
        </div>
      )}

      {/* Cancellation Modal (Section 33) */}
      {cancelModalMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">Cancel Donation Participation</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you are unable to proceed with this donation, please let us know the reason. The matching engine will immediately resume searching for replacement donors to prevent delay for the patient.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Reason for Cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white outline-none"
              >
                <option value="Unexpected personal emergency">Unexpected personal emergency</option>
                <option value="Severe traffic delay / Unable to reach hospital">Severe traffic delay / Unable to reach hospital</option>
                <option value="Feeling unwell / Medical disqualification">Feeling unwell / Medical disqualification</option>
                <option value="Donated blood elsewhere recently">Donated blood elsewhere recently</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalMatchId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelMatch}
                disabled={actionLoading !== null}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Confirm Cancellation & Re-match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
