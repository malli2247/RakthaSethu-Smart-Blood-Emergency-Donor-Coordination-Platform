import React, { useEffect, useState } from 'react';
import { requestsApi } from '../../services/api';
import {
  CheckCircle2,
  Clock,
  Activity,
  UserCheck,
  Navigation,
  MapPin,
  HeartHandshake,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface TimelineEvent {
  key: string;
  title: string;
  timestamp: string;
  actor?: string;
  description: string;
  completed: boolean;
}

interface RequestLifecycleTimelineProps {
  requestId: string;
  currentStatus: string;
}

const LIFECYCLE_STEPS = [
  { key: 'REQUEST_CREATED', label: '1. Request Created', icon: Activity },
  { key: 'DONOR_ACCEPTED', label: '2. Donor Accepted', icon: UserCheck },
  { key: 'DONOR_TRAVELLING', label: '3. Donor Travelling', icon: Navigation },
  { key: 'DONOR_ARRIVED', label: '4. Donor Arrived', icon: MapPin },
  { key: 'DONATION_STARTED', label: '5. Donation Started', icon: HeartHandshake },
  { key: 'DONATION_COMPLETED', label: '6. Donation Completed', icon: Clock },
  { key: 'DONATION_CONFIRMED', label: '7. Hospital Confirmed', icon: FileCheck },
  { key: 'BLOOD_RECEIVED', label: '8. Blood Received', icon: ShieldCheck },
  { key: 'FULFILLED', label: '9. Fulfilled', icon: CheckCircle2 },
];

export const RequestLifecycleTimeline: React.FC<RequestLifecycleTimelineProps> = ({
  requestId,
  currentStatus,
}) => {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchTimeline = async () => {
      try {
        const res = await requestsApi.getTimeline(requestId);
        if (mounted) {
          setTimelineEvents(res.data?.data || []);
        }
      } catch (err) {
        console.error('Error fetching timeline:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTimeline();
    const interval = setInterval(fetchTimeline, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [requestId, currentStatus]);

  // Determine current step index in LIFECYCLE_STEPS
  const statusStepMap: Record<string, string> = {
    PENDING: 'REQUEST_CREATED',
    VALIDATING: 'REQUEST_CREATED',
    MATCHING: 'REQUEST_CREATED',
    DONORS_FOUND: 'REQUEST_CREATED',
    DONOR_CONTACTED: 'REQUEST_CREATED',
    DONOR_ACCEPTED: 'DONOR_ACCEPTED',
    DONOR_TRAVELLING: 'DONOR_TRAVELLING',
    DONOR_ARRIVED: 'DONOR_ARRIVED',
    DONATION_STARTED: 'DONATION_STARTED',
    DONATION_COMPLETED: 'DONATION_COMPLETED',
    DONATION_VERIFICATION_PENDING: 'DONATION_COMPLETED',
    DONATION_CONFIRMED: 'DONATION_CONFIRMED',
    BLOOD_RECEIVED: 'BLOOD_RECEIVED',
    PARTIALLY_FULFILLED: 'DONATION_CONFIRMED',
    FULFILLED: 'FULFILLED',
  };

  const activeKey = statusStepMap[currentStatus] || 'REQUEST_CREATED';
  const activeIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === activeKey);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>Blood Request Lifecycle Tracker</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time verified operational state machine from emergency broadcast to medical fulfillment.
          </p>
        </div>
        <span className="text-[11px] font-extrabold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
          Current State: <strong className="text-slate-900">{currentStatus.replace(/_/g, ' ')}</strong>
        </span>
      </div>

      {/* Horizontal Step Progression Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const isDone = idx < activeIndex || currentStatus === 'FULFILLED';
          const isCurrent = idx === activeIndex && currentStatus !== 'FULFILLED';
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                isDone
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                  : isCurrent
                  ? 'bg-rose-50 border-rose-300 text-rose-700 font-black shadow-sm ring-2 ring-rose-200 animate-pulse'
                  : 'bg-slate-50 border-slate-100 text-slate-400 font-medium'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className="text-[10px] leading-tight line-clamp-2">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Chronological Event History Feed */}
      <div className="border-t border-slate-100 pt-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Official Audit History ({timelineEvents.length} Events Recorded)
        </h3>

        {timelineEvents.length > 0 ? (
          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timelineEvents.map((ev, i) => (
              <div key={i} className="relative group">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-100" />
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1 hover:border-slate-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black text-slate-900 text-sm">{ev.title}</span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(ev.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-slate-600">{ev.description}</p>
                  {ev.actor && (
                    <div className="text-[11px] text-slate-400 font-medium">
                      Action actor: <span className="text-slate-700 font-bold">{ev.actor}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            {loading ? 'Loading official event stream...' : 'No events logged yet.'}
          </div>
        )}
      </div>
    </div>
  );
};
