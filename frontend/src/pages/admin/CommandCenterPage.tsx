import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { emergencyService } from '../../services/emergencyService';
import { EmergencyMap, MapMarkerItem } from '../../components/maps/EmergencyMap';
import {
  ShieldAlert,
  Activity,
  Radio,
  Clock,
  Heart,
  AlertTriangle,
  Building2,
  Users,
  Navigation,
  Sparkles,
  PlayCircle,
  RefreshCw,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export const CommandCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [mapLayers, setMapLayers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const [cmdData, layers] = await Promise.all([
        emergencyService.getCommandCenterData(),
        emergencyService.getMapLayers({
          bloodGroup: selectedBloodGroup || undefined,
          urgency: selectedUrgency || undefined,
        }),
      ]);
      setData(cmdData);
      setMapLayers(layers);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load command center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBloodGroup, selectedUrgency]);

  // Connect to SSE stream for live updates
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:5000/api/emergency/events');

    eventSource.onopen = () => {
      setIsLiveConnected(true);
    };

    eventSource.addEventListener('heartbeat', () => {
      setIsLiveConnected(true);
    });

    eventSource.addEventListener('status_change', () => {
      fetchData();
    });

    eventSource.addEventListener('donor_matched', () => {
      fetchData();
    });

    eventSource.onerror = () => {
      setIsLiveConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Format map items
  const mapItems: MapMarkerItem[] = React.useMemo(() => {
    if (!mapLayers) return [];
    const items: MapMarkerItem[] = [];

    if (mapLayers.requests) {
      mapLayers.requests.forEach((r: any) => {
        items.push({
          id: `req_${r.id}`,
          type: 'REQUEST',
          name: `${r.patientName} (${r.bloodGroup.replace('_', '')})`,
          latitude: r.latitude,
          longitude: r.longitude,
          bloodGroup: r.bloodGroup,
          urgency: r.urgency,
          units: r.unitsRequired,
          address: `${r.hospitalName}, ${r.hospitalCity}`,
        });
      });
    }

    if (mapLayers.hospitals) {
      mapLayers.hospitals.forEach((h: any) => {
        items.push({
          id: `hosp_${h.id}`,
          type: 'HOSPITAL',
          name: h.name,
          latitude: h.latitude,
          longitude: h.longitude,
          address: `${h.address || ''}, ${h.city}`,
          phone: h.contactPhone,
        });
      });
    }

    if (mapLayers.bloodBanks) {
      mapLayers.bloodBanks.forEach((b: any) => {
        items.push({
          id: `bb_${b.id}`,
          type: 'BLOOD_BANK',
          name: b.name,
          latitude: b.latitude,
          longitude: b.longitude,
          address: `${b.address || ''}, ${b.city}`,
          phone: b.contactPhone,
        });
      });
    }

    if (mapLayers.donorZones) {
      mapLayers.donorZones.forEach((z: any) => {
        items.push({
          id: z.zoneId,
          type: 'DONOR_ZONE',
          name: `Verified Donor Zone (${z.bloodGroup.replace('_', '')})`,
          latitude: z.approximateLatitude,
          longitude: z.approximateLongitude,
          bloodGroup: z.bloodGroup,
          address: `${z.city}, ${z.state}`,
        });
      });
    }

    return items;
  }, [mapLayers]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Activity className="w-10 h-10 text-rose-600 animate-spin" />
        <p className="text-slate-600 text-sm font-semibold">Connecting to Emergency Command Center...</p>
      </div>
    );
  }

  const activeEmergencies = data?.activeEmergencies || { critical: 0, high: 0, normal: 0, totalActive: 0 };
  const networkCapacity = data?.networkCapacity || {};
  const shortageAlerts = data?.shortageAlerts || [];
  const liveFeed = data?.liveEmergenciesFeed || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 text-rose-400 text-xs font-black uppercase tracking-wider border border-rose-800/40">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Real-Time Emergency Ops
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className={isLiveConnected ? 'text-emerald-400' : 'text-amber-400'}>
                {isLiveConnected ? 'SSE Live Stream Active' : 'Polling Sync'}
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Emergency Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Monitoring progressive donor discovery, geospatial radius expansions, and acute regional inventory shortages.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Updated {lastRefreshed.toLocaleTimeString()}</span>
          </button>

          <Link
            to="/admin/simulator"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-950 transition"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Run Emergency Simulator</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-extrabold uppercase tracking-wide">Critical ICU</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
          </div>
          <div className="text-3xl font-black text-rose-900 mt-2">{activeEmergencies.critical}</div>
          <span className="text-[11px] text-rose-600 font-semibold mt-1">Immediate action needed</span>
        </div>

        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wide text-amber-800">High Urgency</span>
          <div className="text-3xl font-black text-amber-900 mt-2">{activeEmergencies.high}</div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1">Surgery / Trauma &lt;24h</span>
        </div>

        <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wide text-indigo-800">Coordination Rooms</span>
          <div className="text-3xl font-black text-indigo-900 mt-2">
            {networkCapacity.activeCoordinationRooms || 0}
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold mt-1">Active transit channels</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">Available Donors</span>
          <div className="text-3xl font-black text-emerald-900 mt-2">
            {networkCapacity.availableNow || 0}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1">
            {networkCapacity.emergencyReady || 0} emergency-flagged
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Verified Hospitals</span>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {networkCapacity.verifiedHospitals || 0}
          </div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1">GPS-mapped centers</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Blood Banks</span>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {networkCapacity.certifiedBloodBanks || 0}
          </div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1">Certified storage hubs</span>
        </div>
      </div>

      {/* Main Grid: GIS Map & Live Incident Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: GIS Interactive Map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-rose-600" />
                  Live Geospatial Emergency Network
                </h2>
                <p className="text-xs text-slate-500">
                  Concentric radius circles, verified facilities, and privacy-preserved donor density zones (1.2km offset).
                </p>
              </div>

              {/* Map Filter Controls */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedBloodGroup}
                  onChange={(e) => setSelectedBloodGroup(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700 bg-white"
                >
                  <option value="">All Blood Groups</option>
                  <option value="O_NEGATIVE">O- Negative</option>
                  <option value="O_POSITIVE">O+ Positive</option>
                  <option value="A_POSITIVE">A+ Positive</option>
                  <option value="B_POSITIVE">B+ Positive</option>
                  <option value="AB_POSITIVE">AB+ Positive</option>
                </select>

                <select
                  value={selectedUrgency}
                  onChange={(e) => setSelectedUrgency(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700 bg-white"
                >
                  <option value="">All Urgencies</option>
                  <option value="CRITICAL">Critical Only</option>
                  <option value="HIGH">High Urgency</option>
                </select>
              </div>
            </div>

            {/* Embedded Map Component */}
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <EmergencyMap
                centerLat={17.4325}
                centerLng={78.4072}
                zoom={12}
                activeRadiusKm={10}
                highlightedRadii={[5, 7, 9, 10, 15, 20]}
                items={mapItems}
                height="500px"
              />
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-600 border border-white shadow" />
                  Active Request
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow" />
                  Hospital
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-600 border border-white shadow" />
                  Blood Bank
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow" />
                  Donor Zone (Privacy Fuzzed)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 italic">
                *Exact donor residential coordinates are never broadcast publicly
              </span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Shortage Forecasts & Live Incident Feed */}
        <div className="space-y-6">
          {/* AI Regional Shortage Alerts */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                AI Regional Shortage Alerts
              </h2>
              <span className="text-[11px] font-bold text-slate-400 uppercase">7-Day Horizon</span>
            </div>

            {shortageAlerts.length === 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Regional blood inventory levels are currently stable across all major blood types.
              </div>
            ) : (
              <div className="space-y-3">
                {shortageAlerts.map((alert: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                      alert.shortageRiskLevel === 'CRITICAL'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-black">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        {alert.bloodGroup.replace('_', ' ')} Depletion Risk
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-black bg-rose-600 text-white">
                        {alert.shortageRiskLevel}
                      </span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      {alert.actionableRecommendation || alert.insights}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-bold">
                      <span>Expected Demand: {alert.expectedWeeklyDemandUnits} units</span>
                      <span>Confidence: {alert.confidencePercent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Emergencies Incident Feed */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
                Live Incident Queue
              </h2>
              <span className="text-xs text-slate-500 font-bold">{liveFeed.length} recent</span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {liveFeed.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No emergency requests active</p>
              ) : (
                liveFeed.map((req: any) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center">
                          {req.bloodGroup.replace('_', '').replace('POSITIVE', '+').replace('NEGATIVE', '-')}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                            {req.patientName}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
                            {req.hospitalName}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                          req.urgency === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : req.urgency === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {req.urgency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500 font-semibold">{req.unitsRequired} unit(s) needed</span>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/emergency/search/${req.id}`}
                          className="text-rose-600 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Radius View
                        </Link>
                        <Link
                          to={`/coordination/${req.id}`}
                          className="text-indigo-600 font-bold hover:underline"
                        >
                          Room
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
