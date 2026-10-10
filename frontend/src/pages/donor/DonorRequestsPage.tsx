import React, { useState, useEffect } from 'react';
import { donorApi, requestsApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { BottomSheet } from '../../components/common/BottomSheet';
import {
  AlertCircle,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  Activity,
  Navigation,
  HeartHandshake,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const DonorRequestsPage: React.FC = () => {
  const { t } = useLanguage();
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
      setMessage(err.response?.data?.message || t('somethingWentWrong'));
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
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('emergencyRequests')}
          </h1>
          <p className="text-xs text-slate-500">
            Patients requiring compatible blood in your perimeter.
          </p>
        </div>

        {/* Filter Pills with Horizontal Scroll Safeguard */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl text-xs font-bold overflow-x-auto max-w-full">
          {['ALL', 'NOTIFIED', 'ACTIVE', 'CONFIRMED', 'DECLINED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 touch-target flex items-center justify-center cursor-pointer ${
                filter === st ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-3xl animate-pulse" />
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
                className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-2xs space-y-4 transition-all ${
                  isActiveParticipation ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <BloodGroupBadge bloodGroup={req.bloodGroup} />
                      <UrgencyBadge urgency={req.urgency} />
                      <StatusBadge status={m.status} />
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        Score: {m.compatibilityScore}%
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {req.patientName || 'Emergency Patient'} • {req.unitsRequired} Unit{req.unitsRequired > 1 ? 's' : ''} Needed
                      </h3>
                      {req.medicalReason && (
                        <p className="text-xs text-slate-600 italic mt-0.5">"{req.medicalReason}"</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {req.hospitalName}, {req.hospitalCity}
                      </span>
                      {req.requiredBy && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          Required by: {new Date(req.requiredBy).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    {m.status === 'NOTIFIED' || m.status === 'PENDING' ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleRespond(m.id, 'ACCEPT')}
                          disabled={actionLoading === m.id}
                          className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer touch-target flex items-center justify-center"
                        >
                          I Can Donate
                        </button>
                        <button
                          onClick={() => handleRespond(m.id, 'DECLINE')}
                          disabled={actionLoading === m.id}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs cursor-pointer touch-target flex items-center justify-center"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Active Donation Commitment Panel */}
                {isActiveParticipation && (
                  <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                          Active Donation Commitment
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          Destination: {req.hospitalName} ({req.hospitalCity})
                        </h4>
                      </div>

                      <a
                        href={`/coordination/${req.id}`}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-slate-800"
                      >
                        {t('coordinationRoom')} <ExternalLink className="w-3 h-3 ml-0.5" />
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
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs touch-target cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Start Navigation
                        </button>
                      )}

                      {(isAccepted || isTravelling) && (
                        <button
                          onClick={() => handleMarkArrived(m.id)}
                          disabled={actionLoading === m.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs touch-target cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          I Have Arrived
                        </button>
                      )}

                      {isArrived && (
                        <div className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Arrival Recorded. Hospital notified.
                        </div>
                      )}

                      {req.contactPhone && (
                        <a
                          href={`tel:${req.contactPhone}`}
                          className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 touch-target"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          Call ({req.contactName || 'Coordinator'})
                        </a>
                      )}

                      {(isAccepted || isTravelling) && (
                        <button
                          onClick={() => setCancelModalMatchId(m.id)}
                          disabled={actionLoading === m.id}
                          className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold ml-auto touch-target cursor-pointer"
                        >
                          Can't Donate
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">{t('noDataFound')}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            There are currently no blood requests matching your filter.
          </p>
        </div>
      )}

      {/* Cancellation Bottom Sheet */}
      <BottomSheet
        isOpen={Boolean(cancelModalMatchId)}
        onClose={() => setCancelModalMatchId(null)}
        title={
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            <span>Cancel Donation Participation</span>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            If you are unable to proceed with this donation, please let us know the reason. The matching engine will immediately resume searching for replacement donors to prevent delay for the patient.
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Reason for Cancellation</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-rose-500"
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
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer touch-target"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleCancelMatch}
              disabled={actionLoading !== null}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer touch-target shadow-xs"
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
