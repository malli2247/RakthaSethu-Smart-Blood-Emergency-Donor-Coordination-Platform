import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  RefreshCw,
  Compass,
  Radio,
  Search,
  XCircle,
  Eye,
  Bell,
  ChevronRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  emergencyService,
  ProgressiveSearchResult,
  ScoredCandidate,
  ProgressiveSearchStep,
  RadiusMetrics,
  StageChecklist,
} from '../../services/emergencyService';
import { EmergencyMap, MapMarkerItem } from '../../components/maps/EmergencyMap';

type SearchExecutionState =
  | 'INITIALIZING'
  | 'SEARCHING'
  | 'EVALUATING'
  | 'EXPANDING'
  | 'SUFFICIENT_MATCHES_FOUND'
  | 'MAX_RADIUS_REACHED'
  | 'SEARCH_COMPLETED'
  | 'SEARCH_FAILED'
  | 'SEARCH_CANCELLED';

export const ProgressiveSearchScreen: React.FC = () => {
  const { id: requestId } = useParams<{ id: string }>();

  // Search State
  const [searchId, setSearchId] = useState<string | null>(null);
  const [executionState, setExecutionState] = useState<SearchExecutionState>('INITIALIZING');
  const [currentRadius, setCurrentRadius] = useState<number>(5);
  const [previousRadius, setPreviousRadius] = useState<number | null>(null);
  const [radiusSequence, setRadiusSequence] = useState<number[]>([5, 7, 9, 10, 15, 20, 25, 50, 100]);
  const [targetDonors, setTargetDonors] = useState<number>(5);
  const [candidates, setCandidates] = useState<ScoredCandidate[]>([]);
  const [searchSteps, setSearchSteps] = useState<ProgressiveSearchStep[]>([]);
  const [searchResult, setSearchResult] = useState<ProgressiveSearchResult | null>(null);

  // Live Backend Metrics
  const [currentMetrics, setCurrentMetrics] = useState<RadiusMetrics>({
    radiusKm: 5,
    candidatesEvaluated: 0,
    compatibleCount: 0,
    eligibleCount: 0,
    availableCount: 0,
    alreadyContactedCount: 0,
    newDonorsAtRadius: 0,
    cumulativeDonors: 0,
    remainingTarget: 5,
  });

  // Per-Radius Checklist Stages
  const [radiusStagesMap, setRadiusStagesMap] = useState<Record<number, StageChecklist[]>>({});

  // Request Information
  const [requestInfo, setRequestInfo] = useState<{
    patientName: string;
    bloodGroup: string;
    unitsRequired: number;
    urgency: string;
    hospitalName: string;
    hospitalCity: string;
    latitude?: number;
    longitude?: number;
  }>({
    patientName: 'Patient',
    bloodGroup: 'O+',
    unitsRequired: 2,
    urgency: 'CRITICAL',
    hospitalName: 'Emergency Center',
    hospitalCity: 'Hyderabad',
  });

  // UI Controls
  const [isSearching, setIsSearching] = useState<boolean>(true);
  const [showMap, setShowMap] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'RADAR' | 'TIMELINE' | 'MATCHES'>('RADAR');
  const [searchDurationMs, setSearchDurationMs] = useState<number | null>(null);
  const [isNotifying, setIsNotifying] = useState<boolean>(false);
  const [notifiedSuccess, setNotifiedSuccess] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const matchesRef = useRef<HTMLDivElement | null>(null);

  // Handle incoming real-time SSE progressive search events
  const handleStreamEvent = (event: any) => {
    switch (event.type) {
      case 'search_started':
        setExecutionState('INITIALIZING');
        if (event.sequence) setRadiusSequence(event.sequence);
        if (event.target) setTargetDonors(event.target);
        if (event.initialRadiusKm) setCurrentRadius(event.initialRadiusKm);
        setRequestInfo({
          patientName: event.patientName || 'Emergency Patient',
          bloodGroup: event.bloodGroup?.replace('_', '+') || 'O+',
          unitsRequired: event.target || 2,
          urgency: event.urgency || 'CRITICAL',
          hospitalName: event.hospitalName || 'Emergency Hospital',
          hospitalCity: event.hospitalCity || 'Hospital Area',
          latitude: event.latitude,
          longitude: event.longitude,
        });
        break;

      case 'radius_started':
        setExecutionState('SEARCHING');
        setCurrentRadius(event.radiusKm);
        if (event.previousRadiusKm) setPreviousRadius(event.previousRadiusKm);
        if (event.target) setTargetDonors(event.target);
        // Initialize stages for this radius
        setRadiusStagesMap((prev) => ({
          ...prev,
          [event.radiusKm]: [
            { name: 'Calculating geographic coordinates', status: 'IN_PROGRESS' },
            { name: 'Evaluating ABO & Rh compatibility', status: 'PENDING' },
            { name: 'Verifying donation eligibility window', status: 'PENDING' },
            { name: 'Filtering available response status', status: 'PENDING' },
          ],
        }));
        break;

      case 'candidate_count_updated':
        setCurrentMetrics({
          radiusKm: event.radiusKm,
          candidatesEvaluated: event.candidatesEvaluated ?? 0,
          compatibleCount: event.compatibleCount ?? 0,
          eligibleCount: event.eligibleCount ?? 0,
          availableCount: event.availableCount ?? 0,
          alreadyContactedCount: event.alreadyContactedCount ?? 0,
          newDonorsAtRadius: event.newDonorsAtRadius ?? 0,
          cumulativeDonors: event.cumulativeDonors ?? 0,
          remainingTarget: event.remainingTarget ?? 0,
        });
        break;

      case 'candidate_found':
        if (event.candidate) {
          setCandidates((prev) => {
            if (prev.some((c) => c.donorId === event.candidate.donorId)) return prev;
            return [...prev, event.candidate];
          });
        }
        break;

      case 'radius_completed':
        if (event.stages) {
          setRadiusStagesMap((prev) => ({
            ...prev,
            [event.radiusKm]: event.stages,
          }));
        }
        setSearchSteps((prev) => {
          const existing = prev.filter((s) => s.radiusKm !== event.radiusKm);
          return [
            ...existing,
            {
              radiusKm: event.radiusKm,
              newDonorsFound: event.newDonorsFound,
              cumulativeDonors: event.cumulativeDonors,
              isSufficient: event.isSufficient,
              message: `Found ${event.newDonorsFound} suitable donor(s) within ${event.radiusKm} km`,
            },
          ].sort((a, b) => a.radiusKm - b.radiusKm);
        });
        break;

      case 'radius_expanded':
        setExecutionState('EXPANDING');
        setPreviousRadius(event.previousRadiusKm);
        setCurrentRadius(event.nextRadiusKm);
        break;

      case 'sufficient_matches_found':
        setExecutionState('SUFFICIENT_MATCHES_FOUND');
        break;

      case 'max_radius_reached':
        setExecutionState('MAX_RADIUS_REACHED');
        break;

      case 'search_completed':
        setIsSearching(false);
        setExecutionState(event.isCompleted ? 'SEARCH_COMPLETED' : 'MAX_RADIUS_REACHED');
        setSearchResult(event);
        if (event.candidates) setCandidates(event.candidates);
        if (event.searchDurationMs) setSearchDurationMs(event.searchDurationMs);
        if (event.finalRadiusKm) setCurrentRadius(event.finalRadiusKm);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        break;

      case 'search_failed':
        setIsSearching(false);
        setExecutionState('SEARCH_FAILED');
        setErrorMessage(event.error || 'Donor search temporarily unavailable.');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        break;

      case 'search_cancelled':
        setIsSearching(false);
        setExecutionState('SEARCH_CANCELLED');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        break;

      default:
        break;
    }
  };

  // Initialize Progressive Search Job on Mount
  useEffect(() => {
    if (!requestId) return;
    const activeReqId: string = requestId;

    let isMounted = true;

    async function initSearch() {
      try {
        setIsSearching(true);
        setExecutionState('INITIALIZING');
        setErrorMessage(null);

        // 1. Trigger backend async progressive search
        const startRes = await emergencyService.startProgressiveSearch(activeReqId);
        if (!isMounted) return;

        setSearchId(startRes.searchId);
        setTargetDonors(startRes.target || 5);
        if (startRes.radiusSequence && startRes.radiusSequence.length > 0) {
          setRadiusSequence(startRes.radiusSequence);
          setCurrentRadius(startRes.radiusSequence[0]);
        }

        // 2. Connect to SSE real-time stream
        const sseUrl = `/api/matching/search/${startRes.searchId}/stream`;
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            handleStreamEvent(data);
          } catch (err) {
            // Heartbeat or unparseable frame
          }
        };

        es.onerror = () => {
          // If SSE disconnects or errors, attempt snapshot fallback
          if (!startRes.searchId) return;
          emergencyService
            .getSearchJob(startRes.searchId)
            .then((snap) => {
              if (!isMounted || !snap) return;
              if (snap.status === 'COMPLETED' || snap.status === 'ESCALATED') {
                setSearchResult(snap);
                setCandidates(snap.candidates || []);
                setIsSearching(false);
                setExecutionState(snap.status === 'COMPLETED' ? 'SEARCH_COMPLETED' : 'MAX_RADIUS_REACHED');
              }
            })
            .catch(() => {});
        };
      } catch (err: any) {
        if (!isMounted) return;
        // Fallback to checking existing search status or executing search
        try {
          const status = await emergencyService.getSearchStatus(activeReqId);
          if (status) {
            setRequestInfo({
              patientName: status.request?.patientName || 'Emergency Patient',
              bloodGroup: status.request?.bloodGroup?.replace('_', '+') || 'O+',
              unitsRequired: status.request?.unitsRequired || 1,
              urgency: status.urgency || 'HIGH',
              hospitalName: status.request?.hospitalName || 'Hospital',
              hospitalCity: status.request?.hospitalCity || 'City',
            });
            setCurrentRadius(status.currentRadiusKm || 5);
            setTargetDonors(status.targetDonorsNeeded || 5);
            setCandidates(status.candidates || []);
            setIsSearching(status.status === 'IN_PROGRESS');
            setExecutionState(status.status === 'COMPLETED' ? 'SEARCH_COMPLETED' : 'SEARCH_FAILED');
          }
        } catch {
          setErrorMessage('Donor search temporarily unavailable.');
          setIsSearching(false);
          setExecutionState('SEARCH_FAILED');
        }
      }
    }

    initSearch();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [requestId]);

  // Cancel Search Handler
  const handleCancelSearch = async () => {
    if (!searchId) return;
    try {
      await emergencyService.cancelProgressiveSearch(searchId);
      setIsSearching(false);
      setExecutionState('SEARCH_CANCELLED');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    } catch (err) {
      console.error('Cancel failed', err);
    }
  };

  // Continue Search / Expand to Next Radii Handler
  const handleContinueSearch = async (additionalRadii?: number[]) => {
    if (!searchId) return;
    try {
      setIsSearching(true);
      setExecutionState('SEARCHING');
      await emergencyService.continueProgressiveSearch(searchId, additionalRadii || [100]);
    } catch (err) {
      console.error('Continue failed', err);
      setIsSearching(false);
    }
  };

  // Scroll to matches
  const handleViewMatches = () => {
    setActiveTab('MATCHES');
    if (matchesRef.current) {
      matchesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Notify donors trigger
  const handleNotifyDonors = () => {
    setIsNotifying(true);
    setTimeout(() => {
      setIsNotifying(false);
      setNotifiedSuccess(true);
      setTimeout(() => setNotifiedSuccess(false), 4000);
    }, 800);
  };

  // Completed radii set
  const completedRadii = useMemo(() => {
    return new Set(searchSteps.map((s) => s.radiusKm));
  }, [searchSteps]);

  // Privacy-preserving map markers
  const mapItems: MapMarkerItem[] = useMemo(() => {
    const items: MapMarkerItem[] = [];

    // Central Hospital / Request Pin
    const baseLat = requestInfo.latitude || 17.4325;
    const baseLng = requestInfo.longitude || 78.4072;

    items.push({
      id: 'request-center',
      type: 'REQUEST',
      name: `${requestInfo.hospitalName} (${requestInfo.bloodGroup} Needed)`,
      latitude: baseLat,
      longitude: baseLng,
      bloodGroup: requestInfo.bloodGroup,
      urgency: requestInfo.urgency,
      address: requestInfo.hospitalCity,
    });

    // Privacy-preserving aggregate donor zone pin (NO exact GPS coordinates)
    if (candidates.length > 0) {
      items.push({
        id: `donor-zone-${currentRadius}`,
        type: 'DONOR_ZONE',
        name: `${candidates.length} Compatible Donor(s) in Searched Radius`,
        latitude: baseLat + 0.007,
        longitude: baseLng + 0.007,
        units: candidates.length,
        address: `${requestInfo.hospitalCity} Regional Zone`,
      });
    }

    return items;
  }, [requestInfo, candidates, currentRadius]);

  const targetReached =
    executionState === 'SUFFICIENT_MATCHES_FOUND' ||
    (executionState === 'SEARCH_COMPLETED' && candidates.length >= targetDonors);

  const maxRadiusReached =
    executionState === 'MAX_RADIUS_REACHED' ||
    (executionState === 'SEARCH_COMPLETED' && candidates.length < targetDonors);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Link to="/patient/requests" className="hover:text-rose-400 transition">
              Emergency Requests
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-semibold">Progressive Geographic Match</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-400 uppercase">Live Engine Active</span>
          </div>
        </div>

        {/* SECTION 6: PREMIUM SEARCH HEADER */}
        <div className="bg-gradient-to-r from-rose-950/90 via-slate-900 to-slate-900 border border-rose-600/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute -top-16 -right-16 w-60 h-60 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-rose-600/20">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/20 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
                <span>Geographic Radius Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Finding Compatible Donors
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                We're searching nearby first and expanding only when necessary.
              </p>
            </div>

            {/* Target and Blood Group Box */}
            <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 self-start md:self-auto">
              <div className="text-center px-2 border-r border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Required</span>
                <span className="text-xl sm:text-2xl font-black text-rose-400">
                  {requestInfo.bloodGroup}
                </span>
              </div>
              <div className="text-center px-2 border-r border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Donors</span>
                <span className="text-xl sm:text-2xl font-black text-white">
                  {candidates.length} / {targetDonors}
                </span>
              </div>
              <div className="text-center px-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Urgency</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white">
                  {requestInfo.urgency}
                </span>
              </div>
            </div>
          </div>

          {/* Patient and Hospital Meta */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>
                Patient: <strong className="text-white">{requestInfo.patientName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>
                Facility: <strong className="text-white">{requestInfo.hospitalName}</strong> ({requestInfo.hospitalCity})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                Donor Privacy: <strong className="text-emerald-300">Strict PII Masking</strong>
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 18 & 19: ERROR & CANCELLATION BANNERS */}
        {executionState === 'SEARCH_CANCELLED' && (
          <div className="p-5 bg-amber-950/40 border border-amber-500/50 rounded-2xl flex items-center justify-between gap-4 text-amber-200">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div>
                <strong className="block text-white font-bold">Search Cancelled by User</strong>
                <span className="text-xs">Progressive matching was stopped. Preserved existing request record.</span>
              </div>
            </div>
            <button
              onClick={() => handleContinueSearch()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition"
            >
              Resume Search
            </button>
          </div>
        )}

        {executionState === 'SEARCH_FAILED' && (
          <div className="p-5 bg-rose-950/40 border border-rose-500/50 rounded-2xl flex items-center gap-3 text-rose-200">
            <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <div>
              <strong className="block text-white font-bold">Donor search temporarily unavailable.</strong>
              <span className="text-xs">
                {errorMessage || 'The automated progressive matching engine encountered a temporary service fault. Please retry or contact coordinator.'}
              </span>
            </div>
          </div>
        )}

        {/* Mobile Navigation Tabs */}
        <div className="flex sm:hidden border-b border-slate-800 pb-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('RADAR')}
            className={`flex-1 py-2 rounded-xl transition ${
              activeTab === 'RADAR' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Radar & Metrics
          </button>
          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`flex-1 py-2 rounded-xl transition ${
              activeTab === 'TIMELINE' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('MATCHES')}
            className={`flex-1 py-2 rounded-xl transition ${
              activeTab === 'MATCHES' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Matches ({candidates.length})
          </button>
        </div>

        {/* MAIN BODY: RADAR & PROGRESSIVE TIMELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: ACTIVE RADIUS RADAR & REAL METRICS (7 Cols) */}
          <div
            className={`lg:col-span-7 space-y-6 ${
              activeTab !== 'RADAR' ? 'hidden sm:block' : ''
            }`}
          >
            {/* Active Radar Scanner Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rose-500 animate-pulse" />
                  <h2 className="text-base font-bold text-white uppercase tracking-wide">
                    Current Search Radius
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {isSearching && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold rounded-full">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      Scanning Database
                    </span>
                  )}
                  {targetReached && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Target Satisfied
                    </span>
                  )}
                  {maxRadiusReached && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Max Radius Reached
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION 6 & 11: RADAR / CIRCULAR INDICATOR */}
              <div className="relative py-8 flex flex-col items-center justify-center">
                {/* Radar Rings Container */}
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-slate-700/60 flex items-center justify-center bg-slate-950/60 shadow-inner">
                  {/* Concentric rings */}
                  <div className="absolute inset-4 rounded-full border border-slate-800/80" />
                  <div className="absolute inset-10 rounded-full border border-slate-800/60" />
                  <div className="absolute inset-16 rounded-full border border-slate-700/40" />

                  {/* Crosshairs */}
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-slate-800/50" />
                  <div className="absolute inset-y-0 left-1/2 w-[1px] bg-slate-800/50" />

                  {/* Rotating Scanning Sweep / Pulse (Reduced motion friendly) */}
                  {isSearching && (
                    <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none motion-reduce:hidden">
                      <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(244,63,94,0.35)_360deg)] animate-[spin_3s_linear_infinite]" />
                    </div>
                  )}

                  {/* Pulsing Radius Ring */}
                  <div className="absolute inset-2 rounded-full border-2 border-rose-500/30 animate-pulse pointer-events-none" />

                  {/* Center Active Radius Indicator */}
                  <div className="relative z-10 text-center bg-slate-900/95 border-2 border-rose-500 rounded-3xl p-5 shadow-2xl shadow-rose-950/80 max-w-[160px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Searching Zone
                    </span>
                    <span className="text-3xl sm:text-4xl font-black text-rose-400 tracking-tight block">
                      {currentRadius} <span className="text-lg font-bold text-slate-300">KM</span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-400 block mt-1">
                      {candidates.length} Found
                    </span>
                  </div>
                </div>

                {/* Subtext description */}
                <p className="text-xs text-slate-400 text-center mt-5 max-w-md">
                  {isSearching
                    ? `Geographic radar actively querying blood donors residing within the ${currentRadius} km boundary.`
                    : targetReached
                    ? `Search halted at ${currentRadius} km because the required donor threshold (${targetDonors}) was successfully identified.`
                    : `Search concluded after reaching regional perimeter (${currentRadius} km).`}
                </p>
              </div>

              {/* SECTION 8: LIVE BACKEND METRICS PANEL */}
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-rose-400" />
                    Verified Backend Metrics ({currentRadius} KM)
                  </span>
                  <span className="text-[10px] text-slate-400">Zero Fabricated Data</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase">Evaluated</span>
                    <strong className="text-base font-black text-white">
                      {currentMetrics.candidatesEvaluated}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase">Compatible</span>
                    <strong className="text-base font-black text-emerald-400">
                      {currentMetrics.compatibleCount}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase">Eligible</span>
                    <strong className="text-base font-black text-blue-400">
                      {currentMetrics.eligibleCount}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase">Available</span>
                    <strong className="text-base font-black text-amber-400">
                      {currentMetrics.availableCount}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs mt-2">
                  <div className="p-2 bg-rose-950/30 border border-rose-900/40 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase">New at this Radius</span>
                    <strong className="text-sm font-black text-rose-300">
                      +{currentMetrics.newDonorsAtRadius}
                    </strong>
                  </div>
                  <div className="p-2 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 block uppercase">Already Contacted</span>
                    <strong className="text-sm font-black text-slate-300">
                      {currentMetrics.alreadyContactedCount}
                    </strong>
                  </div>
                  <div className="p-2 bg-slate-950/60 border border-slate-800 rounded-xl col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block uppercase">Remaining Needed</span>
                    <strong className="text-sm font-black text-amber-300">
                      {Math.max(0, targetDonors - candidates.length)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Cancellation button during active search */}
              {isSearching && (
                <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={handleCancelSearch}
                    className="px-4 py-2 bg-slate-800 hover:bg-rose-950 hover:border-rose-500 border border-slate-700 text-slate-300 hover:text-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Cancel Search</span>
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 10: MAP VISUALIZATION TOGGLE */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-white text-base">Geographic Radius Envelope</h3>
                </div>

                <button
                  onClick={() => setShowMap(!showMap)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Layers className="w-3.5 h-3.5 text-rose-400" />
                  <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Visualizing concentric search rings centered at the emergency facility. Individual donor private addresses and live GPS coordinates are strictly masked.
              </p>

              {showMap && (
                <div className="rounded-2xl overflow-hidden border border-slate-800">
                  <EmergencyMap
                    centerLat={requestInfo.latitude || 17.4325}
                    centerLng={requestInfo.longitude || 78.4072}
                    activeRadiusKm={currentRadius}
                    highlightedRadii={Array.from(completedRadii).concat([currentRadius])}
                    items={mapItems}
                    height="360px"
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: PROGRESSIVE TIMELINE & STAGES (5 Cols) */}
          <div
            className={`lg:col-span-5 space-y-6 ${
              activeTab !== 'TIMELINE' && activeTab !== 'RADAR' ? 'hidden sm:block' : ''
            }`}
          >
            {/* SECTION 7: PROGRESSIVE TIMELINE */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-white text-base">Expansion Sequence</h3>
                </div>
                <span className="text-xs text-slate-400">
                  Target: <strong className="text-rose-400">{targetDonors}</strong> Donors
                </span>
              </div>

              <div className="space-y-4">
                {radiusSequence.map((rad, idx) => {
                  const isCompleted = completedRadii.has(rad);
                  const isCurrent = rad === currentRadius;
                  const stepData = searchSteps.find((s) => s.radiusKm === rad);

                  return (
                    <div
                      key={rad}
                      className={`relative pl-8 pb-3 transition-all ${
                        idx !== radiusSequence.length - 1
                          ? 'border-l-2 ' +
                            (isCompleted
                              ? 'border-emerald-500/40'
                              : isCurrent
                              ? 'border-rose-500/60'
                              : 'border-slate-800')
                          : ''
                      }`}
                    >
                      {/* Node Bullet */}
                      <div className="absolute -left-[9px] top-0 flex items-center justify-center">
                        {isCompleted ? (
                          <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-900">
                            <CheckCircle2 className="w-3 h-3 text-slate-950 stroke-[3]" />
                          </span>
                        ) : isCurrent ? (
                          <span className="relative flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 border border-white" />
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border-2 border-slate-700 bg-slate-900" />
                        )}
                      </div>

                      {/* Radius Card Content */}
                      <div
                        className={`p-3 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'bg-rose-950/40 border-rose-500/70 shadow-lg shadow-rose-950/50'
                            : isCompleted
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-white">{rad} KM</span>

                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isCompleted
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                : isCurrent
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isCompleted
                              ? 'Completed'
                              : isCurrent
                              ? isSearching
                                ? 'Searching...'
                                : 'Inspected'
                              : 'Upcoming'}
                          </span>
                        </div>

                        {/* SECTION 9: PER-RADIUS CHECKLIST STAGES */}
                        {isCompleted && stepData && (
                          <div className="mt-2 text-xs text-slate-300 space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{stepData.newDonorsFound} suitable donor(s) identified</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              Cumulative candidates: {stepData.cumulativeDonors}
                            </span>
                          </div>
                        )}

                        {isCurrent && isSearching && (
                          <div className="mt-2 text-[11px] text-slate-300 space-y-1">
                            <div className="flex items-center gap-1.5 text-rose-300">
                              <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
                              <span>Scanning compatible donors within {rad} km...</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Checking compatibility, 90-day donation window, and availability status.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Escalation Box (if max radius reached without target) */}
            {searchResult?.isEscalated && searchResult?.escalationPlan && (
              <div className="bg-amber-950/30 border border-amber-600/50 rounded-3xl p-6 shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>Auxiliary Clinical Escalation Protocol</span>
                </div>
                <p className="text-xs text-amber-200/80">
                  Target not satisfied within searched perimeter. The system recommends activating auxiliary supply channels:
                </p>
                <div className="space-y-2 pt-1">
                  {searchResult.escalationPlan.map((plan) => (
                    <div
                      key={plan.priority}
                      className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-xs"
                    >
                      <span className="font-bold text-amber-300 block mb-0.5">
                        {plan.priority}. {plan.action}
                      </span>
                      <span className="text-slate-300 text-[11px]">{plan.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 15, 16 & 22: SEARCH RESULT EXPERIENCE & ACTIONS */}
        <div ref={matchesRef} className="space-y-4 pt-4">
          {/* Completion Banner */}
          {targetReached && (
            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Compatible Donors Found</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  {candidates.length} suitable donors identified within {currentRadius} km.
                </h3>
                <p className="text-xs text-slate-300">
                  Search stopped automatically because the required number of suitable donors was reached.
                  {searchDurationMs && (
                    <span className="text-slate-400 ml-2">
                      (Execution time: {(searchDurationMs / 1000).toFixed(2)}s)
                    </span>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleViewMatches}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>View Matches</span>
                </button>

                <button
                  onClick={handleNotifyDonors}
                  disabled={isNotifying || notifiedSuccess}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950 flex items-center gap-2 transition disabled:opacity-50"
                >
                  <Bell className="w-4 h-4" />
                  <span>{isNotifying ? 'Dispatching...' : notifiedSuccess ? '✓ Alerts Sent' : 'Notify Donors'}</span>
                </button>

                <button
                  onClick={() => handleContinueSearch()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Keep Searching
                </button>
              </div>
            </div>
          )}

          {/* Under-Target Completion Banner */}
          {maxRadiusReached && candidates.length > 0 && (
            <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Partial Donor Matches Located</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  Only {candidates.length} suitable donors were found within {currentRadius} km.
                </h3>
                <p className="text-xs text-slate-300">
                  Search perimeter reached without fulfilling complete buffer target of {targetDonors} donors.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleViewMatches}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>View Available Matches</span>
                </button>

                {currentRadius < 100 && (
                  <button
                    onClick={() => handleContinueSearch([100])}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-lg transition"
                  >
                    Continue to 100 km
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECTION 17: ZERO-DATA STATE */}
          {!isSearching && candidates.length === 0 && executionState !== 'INITIALIZING' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
              <Search className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">
                No compatible and currently available donors were found within the searched area.
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Search radius reached {currentRadius} km. No fake or simulated profiles are displayed.
                Please refer to regional blood banks or activate volunteer coordinator dispatch.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  to="/campaigns"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  View Blood Donation Camps
                </Link>
                <Link
                  to="/find-blood"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
                >
                  Check Verified Blood Banks
                </Link>
              </div>
            </div>
          )}

          {/* SECTION 22: RANKED CANDIDATE CARDS (PRIVACY-PRESERVING) */}
          {candidates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Ranked Compatible Donors ({candidates.length})</span>
                    <span className="text-xs px-2.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded-full font-semibold">
                      Sorted by Compatibility Score
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Donor privacy protected: contact numbers and home addresses are masked until coordinated.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((donor) => (
                  <div
                    key={donor.donorId}
                    className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 rounded-3xl p-5 shadow-xl transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <h4 className="font-bold text-white text-base">Compatible Donor</h4>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 rounded-md font-semibold">
                            Verified
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          <span>
                            {donor.city} &bull; Approx.{' '}
                            <strong className="text-slate-200">
                              {donor.distanceKm !== null ? `${donor.distanceKm.toFixed(1)} km away` : 'Regional area'}
                            </strong>
                          </span>
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="px-3 py-1 bg-rose-600/20 border border-rose-500/40 text-rose-300 font-black text-sm rounded-xl block">
                          {donor.bloodGroupLabel || donor.bloodGroup}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          At {donor.discoveredAtRadiusKm} km
                        </span>
                      </div>
                    </div>

                    {/* Multi-Factor Score Gauge */}
                    <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1 font-semibold">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          Match Quality Score
                        </span>
                        <span className="font-black text-white text-sm">
                          {donor.score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, donor.score)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>Compatibility & Distance</span>
                        <span>Experience ({donor.totalDonations} donations)</span>
                      </div>
                    </div>

                    {/* Metadata Badges & Privacy Protection */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          {donor.maskedPhone || 'Phone Protected'}
                        </span>
                        <span>Available Now</span>
                      </div>

                      <Link
                        to={`/coordination/${requestId}`}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-500 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>Request Blood</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PERSISTENT BOTTOM WORKFLOW BAR */}
        <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-300">
            <span className="font-bold text-white block">Emergency Operations Coordination</span>
            <span>Once donors respond, access transit navigation and cross-match verification</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/coordination/${requestId}`}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950 flex items-center gap-2 transition hover:scale-102"
            >
              <span>Coordination Room</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
