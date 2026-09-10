import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { requestsApi, matchingApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { StatusBadge } from '../../components/StatusBadge';
import {
  AlertCircle,
  Building2,
  Clock,
  Phone,
  CheckCircle2,
  User,
  MapPin,
  Activity,
  ArrowLeft,
  XCircle,
} from 'lucide-react';

const STEPS = [
  'PENDING',
  'MATCHING',
  'DONOR_CONTACTED',
  'DONOR_ACCEPTED',
  'DONATION_CONFIRMED',
  'FULFILLED',
];

export const RequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const [reqRes, matchRes] = await Promise.all([
        requestsApi.getById(id),
        matchingApi.getRequestMatches(id),
      ]);
      setRequest(reqRes.data?.data);
      setMatches(matchRes.data?.data?.matches || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 10000); // Polling for live status updates every 10s
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

  const currentStepIndex = STEPS.indexOf(request.status);

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
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              Request for {request.patientName} ({request.unitsRequired} Unit{request.unitsRequired > 1 ? 's' : ''})
            </h1>
            <p className="text-xs text-slate-500">
              Broadcasted on {new Date(request.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Lifecycle Stepper */}
        <div className="py-4 border-t border-b border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            {[
              { key: 'PENDING', label: '1. Broadcasted' },
              { key: 'MATCHING', label: '2. Matching Donors' },
              { key: 'DONOR_ACCEPTED', label: '3. Donor Accepted' },
              { key: 'DONATION_CONFIRMED', label: '4. Confirmed' },
              { key: 'FULFILLED', label: '5. Fulfilled' },
            ].map((step, idx) => {
              const active = STEPS.indexOf(step.key) <= currentStepIndex;
              return (
                <div
                  key={step.key}
                  className={`p-2 rounded-xl border transition-all ${
                    active
                      ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
                      : 'bg-slate-50 border-slate-100 text-slate-400 font-medium'
                  }`}
                >
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
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

      {/* Matched Donors Section */}
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
            {matches.map((m) => {
              const isAccepted = m.status === 'ACCEPTED';

              return (
                <div
                  key={m.matchId}
                  className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{m.fullName}</span>
                      <BloodGroupBadge bloodGroup={m.bloodGroup} size="sm" />
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {m.score}% Match Score
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {m.city}, {m.state}
                        {m.distanceKm !== null && ` (${m.distanceKm} km)`}
                      </span>
                      <span>Contacted: {new Date(m.contactedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {isAccepted ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-3 mt-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <strong>Donor Agreed to Donate!</strong>
                          <div className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-emerald-700" />
                            Direct Phone: <a href={`tel:${m.phone}`} className="underline text-emerald-700">{m.phone}</a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Phone: {m.maskedPhone} (Unlocks upon donor acceptance)
                      </p>
                    )}
                  </div>

                  <div className="self-end sm:self-center">
                    {isAccepted ? (
                      <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                        ACCEPTED
                      </span>
                    ) : m.status === 'DECLINED' ? (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                        DECLINED
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold animate-pulse">
                        Awaiting Response
                      </span>
                    )}
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
    </div>
  );
};
