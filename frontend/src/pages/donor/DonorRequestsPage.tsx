import React, { useState, useEffect } from 'react';
import { donorApi, requestsApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import {
  AlertCircle,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  X,
  Activity,
} from 'lucide-react';

export const DonorRequestsPage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [message, setMessage] = useState<string | null>(null);

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
  }, []);

  const handleRespond = async (matchId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      await requestsApi.respondToMatch(matchId, action);
      setMessage(`Match status updated to: ${action}`);
      fetchMatches();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Error responding to request');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filteredMatches = matches.filter((m) => {
    if (filter === 'ALL') return true;
    return m.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Blood Requests Matching You</h1>
          <p className="text-xs text-slate-500">
            Requests from patients and hospitals in your area where your blood can save a life.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl text-xs font-bold">
          {['ALL', 'NOTIFIED', 'ACCEPTED', 'DECLINED'].map((st) => (
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

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <BloodGroupBadge bloodGroup={req.bloodGroup} />
                    <UrgencyBadge urgency={req.urgency} />
                    <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      Match Score: {m.compatibilityScore}%
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Patient: {req.patientName} ({req.unitsRequired} Unit{req.unitsRequired > 1 ? 's' : ''})
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

                  {m.status === 'ACCEPTED' && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-900 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-rose-600" />
                      <span>
                        Hospital Contact: <strong>{req.contactName}</strong> ({req.contactPhone})
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                  {m.status === 'NOTIFIED' ? (
                    <>
                      <button
                        onClick={() => handleRespond(m.id, 'ACCEPT')}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
                      >
                        Accept & Share Contact
                      </button>
                      <button
                        onClick={() => handleRespond(m.id, 'DECLINE')}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                      >
                        Decline
                      </button>
                    </>
                  ) : m.status === 'ACCEPTED' ? (
                    <div className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Accepted
                    </div>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 font-medium text-xs">
                      Declined
                    </span>
                  )}
                </div>
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
    </div>
  );
};
