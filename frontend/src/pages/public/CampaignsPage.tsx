import React, { useState, useEffect } from 'react';
import { campaignApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Campaign } from '../../types';
import {
  Calendar,
  MapPin,
  Users,
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

export const CampaignsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      const res = await campaignApi.list();
      setCampaigns(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleRegister = async (campaignId: string) => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/campaigns`;
      return;
    }

    try {
      await campaignApi.register(campaignId);
      setMessage('Successfully registered for blood donation drive!');
      fetchCampaigns();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Could not register for campaign.');
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5" />
          Community Blood Donation Drives
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Blood Donation Camps & Drives
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Join authorized blood donation camps organized by Red Cross, local hospitals, and
          humanitarian volunteers. Free health check-up and donor certificates provided.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2 max-w-lg mx-auto shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {message}
        </div>
      )}

      {/* Campaigns Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse p-6"
            />
          ))}
        </div>
      ) : campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-700">
                    {c.status}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Users className="w-3.5 h-3.5" />
                    {c.registeredCount} Registered
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug">{c.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {c.description}
                </p>

                <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      {new Date(c.startDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      {new Date(c.startDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(c.endDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="truncate">
                      {c.location}, {c.city}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-400 block">Target Units</span>
                  <span className="font-bold text-slate-800">{c.targetUnits} Units</span>
                </div>

                <button
                  onClick={() => handleRegister(c.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
                >
                  Register to Donate
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center max-w-md mx-auto border border-slate-200">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Active Campaigns</h3>
          <p className="text-xs text-slate-500 mt-1">
            Check back soon for upcoming community donation drives in your city.
          </p>
        </div>
      )}
    </div>
  );
};
