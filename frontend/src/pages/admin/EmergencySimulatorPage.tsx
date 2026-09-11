import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { emergencyService } from '../../services/emergencyService';
import {
  PlayCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  Compass,
  Building2,
  Users,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
} from 'lucide-react';

export const EmergencySimulatorPage: React.FC = () => {
  const [bloodGroup, setBloodGroup] = useState('O_NEGATIVE');
  const [unitsRequired, setUnitsRequired] = useState(2);
  const [urgency, setUrgency] = useState('CRITICAL');
  const [hospitalName, setHospitalName] = useState('Apollo Emergency Trauma Center');
  const [city, setCity] = useState('Hyderabad');
  const [state, setState] = useState('Telangana');
  const [latitude, setLatitude] = useState(17.4325);
  const [longitude, setLongitude] = useState(78.4072);

  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSimulationResult(null);
    setActiveStepIndex(0);

    try {
      const res = await emergencyService.simulateEmergency({
        bloodGroup,
        unitsRequired: Number(unitsRequired),
        urgency,
        hospitalName,
        city,
        state,
        latitude: Number(latitude),
        longitude: Number(longitude),
      });

      setSimulationResult(res);

      // Animate steps progressively
      if (res.timeline && res.timeline.length > 0) {
        for (let i = 0; i < res.timeline.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 450));
          setActiveStepIndex(i + 1);
        }
      }
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black uppercase tracking-wider border border-rose-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Admin & Disaster Testing Sandbox
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Emergency Search Simulator
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Simulate progressive geospatial donor discovery rings (5km → 7km → 9km → 10km → 15km+), multi-factor ML scoring, and emergency escalation without triggering real patient broadcasts.
          </p>
        </div>

        <Link
          to="/admin/command-center"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
        >
          <Radio className="w-4 h-4 text-rose-500" />
          <span>Live Command Center</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Simulation Configuration Parameters */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Compass className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-black text-slate-900">Scenario Configuration</h2>
          </div>

          <form onSubmit={handleRunSimulation} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2 text-xs font-black rounded-xl border border-slate-300 text-rose-700 bg-white"
              >
                <option value="O_NEGATIVE">O- Negative (Universal Donor)</option>
                <option value="O_POSITIVE">O+ Positive</option>
                <option value="A_POSITIVE">A+ Positive</option>
                <option value="A_NEGATIVE">A- Negative</option>
                <option value="B_POSITIVE">B+ Positive</option>
                <option value="B_NEGATIVE">B- Negative</option>
                <option value="AB_POSITIVE">AB+ Positive</option>
                <option value="AB_NEGATIVE">AB- Negative</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Units Required</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={unitsRequired}
                  onChange={(e) => setUnitsRequired(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-800 bg-white"
                >
                  <option value="CRITICAL">CRITICAL (ICU)</option>
                  <option value="HIGH">HIGH (&lt;24h)</option>
                  <option value="NORMAL">NORMAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Simulated Hospital Venue</label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-md shadow-rose-200 transition flex items-center justify-center gap-2"
            >
              {simulating ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Executing Algorithm Simulation...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>Execute Search Simulation</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right 2 Cols: Simulation Step-by-Step Progress & Results */}
        <div className="lg:col-span-2 space-y-6">
          {!simulationResult && !simulating && (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
              <Compass className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Active Simulation</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Configure the emergency scenario parameters on the left and click "Execute Search Simulation" to observe algorithm execution and candidate ranking.
              </p>
            </div>
          )}

          {simulationResult && (
            <>
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Initial Radius</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {simulationResult.summary?.initialRadiusKm} km
                  </div>
                  <span className="text-[10px] text-slate-500">Starting envelope</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Final Expansion</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    {simulationResult.summary?.finalRadiusKm} km
                  </div>
                  <span className="text-[10px] text-slate-500">Safe envelope reached</span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Discovered Donors</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {simulationResult.summary?.totalDonorsDiscovered}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {simulationResult.summary?.donorsContacted} contacted
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Est. Response Time</span>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    {simulationResult.summary?.estimatedResponseTimeMinutes}m
                  </div>
                  <span className="text-[10px] text-slate-500">ML calibrated latency</span>
                </div>
              </div>

              {/* Step by Step Timeline */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-rose-600" />
                    Simulation Execution Timeline
                  </h3>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    {simulationResult.summary?.status}
                  </span>
                </div>

                <div className="space-y-3">
                  {simulationResult.timeline?.map((step: any, idx: number) => {
                    const isPassed = idx < activeStepIndex;
                    const isCurrent = idx === activeStepIndex - 1;

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all duration-300 ${
                          isCurrent
                            ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-sm'
                            : isPassed
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-50/40 border-slate-100 opacity-40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                isPassed
                                  ? 'bg-emerald-600 text-white'
                                  : isCurrent
                                  ? 'bg-rose-600 text-white animate-pulse'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-900">{step.stage.replace(/_/g, ' ')}</h4>
                              <p className="text-xs text-slate-600 mt-0.5">{step.detail}</p>
                            </div>
                          </div>

                          {step.radiusKm && (
                            <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                              {step.radiusKm} km radius
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
