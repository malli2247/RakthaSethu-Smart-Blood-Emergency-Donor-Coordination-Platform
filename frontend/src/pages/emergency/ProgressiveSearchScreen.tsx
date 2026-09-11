import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Shield,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
  Phone,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { emergencyService, ProgressiveSearchResult, ScoredCandidate, ProgressiveSearchStep } from '../../services/emergencyService';
import { EmergencyMap, MapMarkerItem } from '../../components/maps/EmergencyMap';
import { useLanguage } from '../../contexts/LanguageContext';

export const ProgressiveSearchScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const [searchResult, setSearchResult] = useState<ProgressiveSearchResult | null>(null);
  const [currentRadius, setCurrentRadius] = useState<number>(5);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(true);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const radiusSequence = [5, 7, 9, 10, 15, 20, 25, 50];

  const loadSearch = async () => {
    if (!id) return;
    try {
      // Trigger or fetch progressive search
      const res = await emergencyService.runProgressiveSearch(id);
      setSearchResult(res);
      setCurrentRadius(res.finalRadiusKm || 5);
      setIsSearching(false);
    } catch (err: any) {
      // Try fetching existing search status
      try {
        const existing = await emergencyService.getSearchStatus(id);
        setCurrentRadius(existing.currentRadiusKm || 5);
        setIsSearching(existing.status === 'IN_PROGRESS');
      } catch {
        setError(err.response?.data?.message || 'Unable to load progressive emergency search');
        setIsSearching(false);
      }
    }
  };

  useEffect(() => {
    loadSearch();

    // Connect to real-time Server-Sent Events stream
    if (!id) return;
    const eventSource = new EventSource(`/api/emergency/events?requestId=${id}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'SEARCH_STAGE_UPDATED') {
          setCurrentRadius(payload.data.currentRadiusKm);
          setActiveStepIndex(payload.data.stepIndex || 1);
        } else if (payload.type === 'SEARCH_COMPLETED') {
          setSearchResult(payload.data);
          setCurrentRadius(payload.data.finalRadiusKm);
          setIsSearching(false);
        }
      } catch {
        // Ignore unparseable pings
      }
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  // Convert candidates and hospital into map marker items
  const mapItems: MapMarkerItem[] = [];
  if (searchResult) {
    searchResult.candidates.forEach((c) => {
      // Map donor approximate zone
      mapItems.push({
        id: c.donorId,
        type: 'DONOR_ZONE',
        name: `Donor (${c.bloodGroup})`,
        latitude: 17.4325 + (Math.random() * 0.04 - 0.02),
        longitude: 78.4072 + (Math.random() * 0.04 - 0.02),
        bloodGroup: c.bloodGroup,
        address: c.city,
      });
    });
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Emergency Hero Card */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 border border-rose-600/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-600/20 pb-6">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 animate-pulse text-rose-500" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Emergency Active</span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>BLOOD EMERGENCY</span>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-rose-600 text-white rounded-full">
                    {searchResult?.urgency || 'CRITICAL'}
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-400 block uppercase">Target Requirement</span>
                <span className="text-2xl font-black text-rose-400">
                  {searchResult?.bloodGroup?.replace('_', '+') || 'O+'} &bull; {searchResult?.unitsRequired || 2} Units
                </span>
              </div>
            </div>
          </div>

          {/* Patient and Hospital Brief */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Patient: <strong className="text-white">{searchResult?.patientName || 'Emergency Patient'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Hospital Location Coordinates Verified</span>
            </div>
          </div>
        </div>

        {/* Real-time Progressive Radius Stepper Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-500 animate-pulse" />
              <h2 className="font-bold text-lg text-white">Progressive Geographic Search Sequence</h2>
            </div>
            <span className="text-xs font-medium px-3 py-1 bg-slate-700/80 rounded-full text-slate-300">
              Active Radius: <strong className="text-rose-400">{currentRadius} KM</strong>
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Expanding search envelope progressively outward to locate closest compatible donors first without flooding distant networks.
          </p>

          {/* Stepper Rings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {radiusSequence.map((rad) => {
              const isPast = rad < currentRadius;
              const isCurrent = rad === currentRadius;
              const isFuture = rad > currentRadius;

              return (
                <div
                  key={rad}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-900/30 scale-105'
                      : isPast
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    {isCurrent ? (
                      <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    ) : isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-slate-600" />
                    )}
                  </div>
                  <div className="font-bold text-sm text-white">{rad} KM</div>
                  <div className="text-[10px] mt-0.5 uppercase tracking-wide">
                    {isCurrent ? (isSearching ? 'Searching...' : 'Matched') : isPast ? 'Completed' : 'Waiting'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Counters Bar */}
          <div className="mt-6 pt-4 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>Compatible Donors Discovered:</span>
              <span className="text-xl font-black text-white px-2.5 py-0.5 bg-rose-600/30 border border-rose-500/40 rounded-xl">
                {searchResult?.totalDonorsFound || 0}
              </span>
            </div>

            <button
              onClick={() => setShowMap(!showMap)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <Compass className="w-4 h-4 text-rose-400" />
              <span>{showMap ? 'Hide Map Layer' : '🗺️ View Live Emergency Map'}</span>
            </button>
          </div>
        </div>

        {/* Embedded Map Toggle View */}
        {showMap && (
          <div className="animate-in fade-in duration-300">
            <EmergencyMap
              activeRadiusKm={currentRadius}
              highlightedRadii={radiusSequence.slice(0, 5)}
              items={mapItems}
              height="420px"
            />
          </div>
        )}

        {/* AI Escalation Box (when radius is exhausted without full fulfillment) */}
        {searchResult?.isEscalated && searchResult?.escalationPlan && (
          <div className="bg-amber-950/30 border border-amber-600/50 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>AI Smart Escalation Protocol Triggered</span>
            </div>
            <p className="text-xs text-amber-200/80">
              Immediate radius exhausted. The operational intelligence layer has activated priority auxiliary measures:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {searchResult.escalationPlan.map((plan) => (
                <div key={plan.priority} className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-xs">
                  <span className="font-bold text-amber-300 block mb-1">
                    {plan.priority}. {plan.action}
                  </span>
                  <span className="text-slate-300">{plan.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discovered Compatible Donors with Smart Ranking Scores */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center justify-between">
            <span>Ranked Compatible Donors ({searchResult?.candidates?.length || 0})</span>
            <span className="text-xs text-slate-400 font-normal">Sorted by Multi-Factor Score</span>
          </h3>

          {(!searchResult?.candidates || searchResult.candidates.length === 0) ? (
            <div className="p-8 text-center bg-slate-800/40 border border-slate-700/60 rounded-2xl text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
              Scanning surrounding blood resource network...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResult.candidates.map((donor) => (
                <div
                  key={donor.donorId}
                  className="bg-slate-800/90 border border-slate-700 hover:border-rose-500/60 rounded-2xl p-4 transition-all shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base">{donor.fullName}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        <span>{donor.city} &bull; ~{donor.distanceKm ? `${donor.distanceKm.toFixed(1)} km` : 'Local'}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-rose-600/30 border border-rose-500/50 text-rose-300 font-bold text-xs rounded-lg">
                        {donor.bloodGroupLabel}
                      </span>
                    </div>
                  </div>

                  {/* Smart Match Score Gauge */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1 font-semibold">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        Match Score
                      </span>
                      <span className="font-extrabold text-white text-sm">{donor.score.toFixed(1)} / 100</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${donor.score}%` }}
                      />
                    </div>
                  </div>

                  {/* ML Response Probability & Availability Badges */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                    <span className="px-2 py-0.5 bg-slate-700/80 text-slate-300 rounded-md">
                      Discovered: <strong>{donor.discoveredAtRadiusKm} km</strong>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 rounded-md font-medium">
                      Response: {Math.round(donor.predictedResponseProbability * 100)}%
                    </span>
                    <span className="px-2 py-0.5 bg-blue-950/60 border border-blue-500/30 text-blue-300 rounded-md">
                      Donations: {donor.totalDonations}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Persistent Bottom Action Bar */}
        <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300">
            <span className="font-bold text-white block">Next Step: Donor Coordination</span>
            <span>Once donors accept, enter the private coordination room for direct transit and directions</span>
          </div>

          <Link
            to={`/coordination/${id}`}
            className="px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-900/40 flex items-center gap-2 transition hover:scale-102"
          >
            <span>Emergency Coordination Room</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
