import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { bloodBankApi, campaignApi } from '../../services/api';
import { emergencyService } from '../../services/emergencyService';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  Send,
  Calendar,
  Layers,
  CheckCircle2,
  RefreshCw,
  Heart,
  Droplets,
  Package,
} from 'lucide-react';

export const CopilotPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [demandForecast, setDemandForecast] = useState<any>(null);
  const [shortageData, setShortageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobilizingGroup, setMobilizingGroup] = useState<string | null>(null);
  const [campaignSuccess, setCampaignSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch regional demand forecast
      const forecast = await emergencyService.getDemandForecast();
      setDemandForecast(forecast);

      // Fetch user's blood bank profile if BLOOD_BANK role
      let bankId: string | null = null;
      if (user?.role === 'BLOOD_BANK') {
        try {
          const profRes = await bloodBankApi.getProfile();
          setProfile(profRes.data?.data);
          bankId = profRes.data?.data?.id;
        } catch (e) {
          console.warn('Could not fetch blood bank profile:', e);
        }
      }

      // If we have a bank ID or fallback to first available
      if (bankId) {
        const shortage = await emergencyService.getShortageForecast(bankId);
        setShortageData(shortage);
      }
    } catch (err) {
      console.error('Failed to load copilot data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleTriggerCampaign = async (bloodGroup: string) => {
    setMobilizingGroup(bloodGroup);
    setCampaignSuccess(null);
    try {
      // Create an emergency targeted donation campaign
      await campaignApi.create({
        title: `URGENT: ${bloodGroup.replace('_', ' ')} Emergency Blood Drive`,
        description: `AI Inventory Copilot has detected an impending acute shortage of ${bloodGroup.replace(
          '_',
          ' '
        )} blood units. Eligible donors in the city are requested to schedule an emergency donation.`,
        organizerName: profile?.name || 'RakthaSethu Blood Bank Network',
        venueName: profile?.name || 'Central Blood Bank & Transfusion Center',
        venueAddress: profile?.address || 'Medical Enclave',
        city: profile?.city || 'Hyderabad',
        state: profile?.state || 'Telangana',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        targetUnits: 25,
        targetBloodGroups: JSON.stringify([bloodGroup]),
      });

      setCampaignSuccess(
        `Targeted emergency mobilization campaign triggered successfully for ${bloodGroup.replace('_', ' ')}!`
      );
    } catch (err: any) {
      console.error('Failed to trigger campaign:', err);
    } finally {
      setMobilizingGroup(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Sparkles className="w-10 h-10 text-rose-600 animate-spin" />
        <p className="text-slate-600 text-sm font-semibold">
          AI Copilot analyzing regional consumption rates and inventory burn rates...
        </p>
      </div>
    );
  }

  const groups = demandForecast?.groups || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl border border-rose-900/30">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black uppercase tracking-wider border border-rose-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            AI Transfusion Copilot
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Intelligent Blood Bank Copilot
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Predictive 7-day regional demand forecasts, inventory depletion burn rate countdowns, and proactive mobilization workflows.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Re-calculate Forecasts</span>
        </button>
      </div>

      {campaignSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{campaignSuccess}</span>
        </div>
      )}

      {/* Specific Blood Bank Inventory Risk Overview (If Loaded) */}
      {shortageData && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Facility Intelligence</span>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-rose-600" />
                {shortageData.bloodBankName} — Depletion Countdown
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-semibold">
                Units Expiring in 72h:{' '}
                <strong className="text-rose-600 font-black">{shortageData.expiringSoonUnits || 0}</strong>
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  shortageData.overallShortageRisk === 'CRITICAL'
                    ? 'bg-red-100 text-red-800'
                    : shortageData.overallShortageRisk === 'HIGH'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {shortageData.overallShortageRisk} RISK
              </span>
            </div>
          </div>

          {/* Group-by-Group Burn Rates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {shortageData.inventorySummary?.map((inv: any, idx: number) => {
              const days = Number(inv.estimatedDaysRemaining);
              const isUrgent = days < 3;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border text-center space-y-1 transition ${
                    isUrgent
                      ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-xs font-black text-slate-900 block">
                    {inv.bloodGroup.replace('_', '').replace('POSITIVE', '+').replace('NEGATIVE', '-')}
                  </span>
                  <div className="text-xl font-black text-slate-900">{inv.currentUnits}</div>
                  <span className="text-[10px] text-slate-500 block">units in stock</span>
                  <div
                    className={`text-[10px] font-bold rounded-lg py-0.5 px-1 ${
                      days < 2
                        ? 'bg-red-600 text-white'
                        : days < 4
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {days > 14 ? '> 14 Days' : `${days}d left`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Proactive Recommendations */}
          {shortageData.proactiveRecommendations?.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-black text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Proactive Mitigation Plan</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-indigo-950 font-medium">
                {shortageData.proactiveRecommendations.map((rec: string, i: number) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 7-Day Regional Demand Forecast Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-rose-600" />
              7-Day Regional Demand Forecast
            </h2>
            <p className="text-xs text-slate-500">
              Generated based on 30-day historical consumption velocity, trauma hospital density, and regional blood group prevalence.
            </p>
          </div>
          <span className="text-xs font-extrabold text-slate-400 uppercase">
            Updated {new Date(demandForecast?.generatedAt || Date.now()).toLocaleDateString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {groups.map((group: any, idx: number) => {
            const isCritical = group.shortageRiskLevel === 'CRITICAL';
            const isHigh = group.shortageRiskLevel === 'HIGH';

            return (
              <div
                key={idx}
                className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between space-y-4 ${
                  isCritical
                    ? 'border-rose-300 ring-2 ring-rose-500/20'
                    : isHigh
                    ? 'border-amber-300'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center font-black text-rose-700 text-sm">
                        {group.bloodGroup
                          .replace('_', '')
                          .replace('POSITIVE', '+')
                          .replace('NEGATIVE', '-')}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">{group.bloodGroup.replace('_', ' ')}</h3>
                        <span className="text-[10px] text-slate-400 font-bold">RBC Transfusion Group</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        isCritical
                          ? 'bg-red-100 text-red-800'
                          : isHigh
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {group.shortageRiskLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Expected 7d Demand</span>
                      <span className="text-base font-black text-slate-900">
                        {group.expectedWeeklyDemandUnits} units
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Velocity Trend</span>
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-1">
                        {group.trend === 'RISING' ? (
                          <>
                            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                            <span className="text-rose-600 font-black">Rising (+18%)</span>
                          </>
                        ) : group.trend === 'DECLINING' ? (
                          <>
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Declining</span>
                          </>
                        ) : (
                          <span className="text-slate-600">Stable</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* AI Insight */}
                  <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    {group.insights}
                  </p>
                </div>

                {/* One-Tap Action */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleTriggerCampaign(group.bloodGroup)}
                    disabled={mobilizingGroup === group.bloodGroup}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                      isCritical
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-300'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {mobilizingGroup === group.bloodGroup
                        ? 'Mobilizing Donors...'
                        : `Mobilize ${group.bloodGroup.replace('_', ' ')} Donors`}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
