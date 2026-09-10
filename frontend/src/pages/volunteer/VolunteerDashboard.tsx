import React, { useState, useEffect } from 'react';
import { volunteerApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import {
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  Building2,
  Users,
} from 'lucide-react';

export const VolunteerDashboard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([volunteerApi.getProfile(), volunteerApi.getTasks()])
      .then(([profRes, taskRes]) => {
        setProfile(profRes.data?.data);
        setTasks(taskRes.data?.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified Humanitarian Volunteer
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {profile?.fullName || 'Volunteer Coordinator'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Service Area: {profile?.serviceAreaCity}, {profile?.serviceAreaState} • Tasks Completed: {profile?.totalTasksCompleted || 0}
          </p>
        </div>
      </div>

      {/* Emergency Tasks */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Active Emergency Coordination Tasks ({tasks.length})
          </h2>
          <p className="text-xs text-slate-500">
            High & Critical emergency requests in {profile?.serviceAreaCity || 'your area'} requiring
            donor coordination or logistics assistance.
          </p>
        </div>

        {tasks.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <BloodGroupBadge bloodGroup={t.bloodGroup} size="sm" />
                    <UrgencyBadge urgency={t.urgency} />
                    <span className="text-xs font-bold text-slate-800">
                      {t.patientName} ({t.unitsRequired} Units)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {t.hospitalName}, {t.hospitalCity}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Needed by: {new Date(t.requiredBy).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  {t.medicalReason && (
                    <p className="text-xs text-slate-600 italic">"{t.medicalReason}"</p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <a
                    href={`tel:${t.contactPhone}`}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call Attendant ({t.contactName})
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">All Clear in Your Service Area</p>
            <p className="text-xs text-slate-400 mt-1">
              No critical coordination tasks pending in {profile?.serviceAreaCity}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
