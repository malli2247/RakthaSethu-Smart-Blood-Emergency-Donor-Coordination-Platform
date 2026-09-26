import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { requestsApi, aiApi } from '../../services/api';
import { BloodGroup, UrgencyLevel } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  AlertCircle,
  Clock,
  MapPin,
  Building2,
  Sparkles,
  Phone,
  User,
  Heart,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Mic,
  CheckCircle2,
  Activity,
  Droplet,
  Compass,
  Lock,
  LogIn,
  Save,
  Check,
} from 'lucide-react';
import { VoiceRequestModal } from '../../components/emergency/VoiceRequestModal';

const STEPS = [
  { id: 1, title: 'Blood Group', subtitle: 'Select required type' },
  { id: 2, title: 'Units Required', subtitle: 'Quantity needed' },
  { id: 3, title: 'Urgency', subtitle: 'Clinical triage' },
  { id: 4, title: 'Hospital', subtitle: 'Facility details' },
  { id: 5, title: 'Location', subtitle: 'City & address' },
  { id: 6, title: 'Contact', subtitle: 'On-site coordinator' },
  { id: 7, title: 'Confirmation', subtitle: 'Verify & broadcast' },
];

const BLOOD_GROUPS_LIST: { group: BloodGroup; label: string; tag: string }[] = [
  { group: 'O_NEGATIVE', label: 'O-', tag: 'Universal Red Cell Donor' },
  { group: 'O_POSITIVE', label: 'O+', tag: 'Most Common Blood Type' },
  { group: 'A_POSITIVE', label: 'A+', tag: 'High Regional Demand' },
  { group: 'A_NEGATIVE', label: 'A-', tag: 'Rare Negative Type' },
  { group: 'B_POSITIVE', label: 'B+', tag: 'High Regional Demand' },
  { group: 'B_NEGATIVE', label: 'B-', tag: 'Rare Negative Type' },
  { group: 'AB_POSITIVE', label: 'AB+', tag: 'Universal Plasma Donor' },
  { group: 'AB_NEGATIVE', label: 'AB-', tag: 'Rarest Blood Type' },
];

export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(
    (searchParams.get('bloodGroup') as BloodGroup) || 'O_POSITIVE'
  );
  const [unitsRequired, setUnitsRequired] = useState<number>(1);
  const [urgency, setUrgency] = useState<UrgencyLevel>('NORMAL');
  const [medicalReason, setMedicalReason] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [requiredBy, setRequiredBy] = useState(
    new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [hospitalCity, setHospitalCity] = useState(searchParams.get('city') || '');
  const [hospitalState, setHospitalState] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<number>(35);
  const [patientGender, setPatientGender] = useState('MALE');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // AI & Voice State
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Authentication & Draft persistence state
  const { isAuthenticated, user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedToast, setDraftSavedToast] = useState(false);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rakthasethu_request_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.bloodGroup) setBloodGroup(d.bloodGroup);
        if (d.unitsRequired) setUnitsRequired(Number(d.unitsRequired));
        if (d.urgency) setUrgency(d.urgency);
        if (d.medicalReason) setMedicalReason(d.medicalReason);
        if (d.hospitalName) setHospitalName(d.hospitalName);
        if (d.requiredBy) setRequiredBy(d.requiredBy);
        if (d.hospitalCity) setHospitalCity(d.hospitalCity);
        if (d.hospitalState) setHospitalState(d.hospitalState);
        if (d.hospitalAddress) setHospitalAddress(d.hospitalAddress);
        if (d.patientName) setPatientName(d.patientName);
        if (d.patientAge) setPatientAge(Number(d.patientAge));
        if (d.patientGender) setPatientGender(d.patientGender);
        if (d.contactName) setContactName(d.contactName);
        if (d.contactPhone) setContactPhone(d.contactPhone);
        if (d.additionalNotes) setAdditionalNotes(d.additionalNotes);
        if (d.currentStep && d.currentStep >= 1 && d.currentStep <= 7) {
          setCurrentStep(d.currentStep);
        }
        setDraftRestored(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const saveDraft = useCallback((overrideStep?: number) => {
    try {
      const draft = {
        bloodGroup,
        unitsRequired,
        urgency,
        medicalReason,
        hospitalName,
        requiredBy,
        hospitalCity,
        hospitalState,
        hospitalAddress,
        patientName,
        patientAge,
        patientGender,
        contactName,
        contactPhone,
        additionalNotes,
        currentStep: overrideStep ?? currentStep,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('rakthasethu_request_draft', JSON.stringify(draft));
      setDraftSavedToast(true);
      setTimeout(() => setDraftSavedToast(false), 2500);
    } catch {
      // Ignore storage errors
    }
  }, [
    bloodGroup,
    unitsRequired,
    urgency,
    medicalReason,
    hospitalName,
    requiredBy,
    hospitalCity,
    hospitalState,
    hospitalAddress,
    patientName,
    patientAge,
    patientGender,
    contactName,
    contactPhone,
    additionalNotes,
    currentStep,
  ]);

  // Progressive Search Animation State after submission
  const [searchRadiusIndex, setSearchRadiusIndex] = useState(0);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const SEARCH_RADII = [5, 7, 9, 10, 15, 20, 50, 100];

  const handleVoiceExtracted = (extracted: {
    bloodGroup: string;
    unitsRequired: number;
    hospitalName: string;
    urgency: string;
  }) => {
    if (extracted.bloodGroup) setBloodGroup(extracted.bloodGroup as BloodGroup);
    if (extracted.unitsRequired) setUnitsRequired(extracted.unitsRequired);
    if (extracted.hospitalName) setHospitalName(extracted.hospitalName);
    if (extracted.urgency) setUrgency(extracted.urgency as UrgencyLevel);
    setVoiceModalOpen(false);
    saveDraft();
  };

  const handleAiTriage = async () => {
    if (!medicalReason.trim()) return;
    setAiLoading(true);
    try {
      const res = await aiApi.classifyUrgency(medicalReason);
      setAiAnalysis(res.data?.data);
      if (res.data?.data?.urgency) {
        setUrgency(res.data.data.urgency);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Step Validation
  const validateStep = (step: number): boolean => {
    setError(null);
    if (step === 1) {
      if (!bloodGroup) {
        setError('Please select a required blood group.');
        return false;
      }
    } else if (step === 2) {
      if (unitsRequired < 1 || unitsRequired > 20) {
        setError('Please specify units between 1 and 20.');
        return false;
      }
    } else if (step === 3) {
      if (!urgency) {
        setError('Please choose an urgency triage level.');
        return false;
      }
    } else if (step === 4) {
      if (!hospitalName.trim()) {
        setError('Please enter the hospital or medical facility name.');
        return false;
      }
      if (!requiredBy) {
        setError('Please provide the needed-by date and time.');
        return false;
      }
    } else if (step === 5) {
      if (!hospitalCity.trim() || !hospitalState.trim() || !hospitalAddress.trim()) {
        setError('Please provide complete hospital city, state, and address.');
        return false;
      }
    } else if (step === 6) {
      if (!patientName.trim()) {
        setError('Please provide the patient full name.');
        return false;
      }
      if (!contactName.trim()) {
        setError('Please enter the on-site contact person name.');
        return false;
      }
      if (!contactPhone.trim() || contactPhone.length < 8) {
        setError('Please enter a valid emergency contact phone number.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      const next = Math.min(currentStep + 1, 7);
      setCurrentStep(next);
      saveDraft(next);
    }
  };

  const prevStep = () => {
    setError(null);
    const prev = Math.max(currentStep - 1, 1);
    setCurrentStep(prev);
    saveDraft(prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(6)) return;
    setError(null);

    // Save draft state
    saveDraft(7);

    // Strict authentication verification: do not broadcast without Bearer token
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    setSubmitting(true);
    setIsSearchingNearby(true);

    try {
      // Simulate real-time progressive radius search animation
      for (let i = 0; i < 3; i++) {
        setSearchRadiusIndex(i);
        await new Promise((r) => setTimeout(r, 400));
      }

      const res = await requestsApi.create({
        patientName: patientName.trim(),
        patientAge: patientAge ? Number(patientAge) : undefined,
        patientGender: patientGender || undefined,
        bloodGroup,
        unitsRequired: Number(unitsRequired),
        hospitalName: hospitalName.trim(),
        hospitalCity: hospitalCity.trim(),
        hospitalState: hospitalState.trim(),
        hospitalAddress: hospitalAddress.trim(),
        requiredBy: new Date(requiredBy).toISOString(),
        urgency,
        medicalReason: medicalReason.trim() || undefined,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        additionalNotes: additionalNotes.trim() || undefined,
      });

      // Clear draft on successful broadcast
      localStorage.removeItem('rakthasethu_request_draft');

      const newRequestId = res.data?.data?.requestId || res.data?.data?.id || res.data?.requestId || res.data?.id;
      navigate(`/patient/requests/${newRequestId}`);
    } catch (err: any) {
      setIsSearchingNearby(false);
      setError(err.response?.data?.message || 'Failed to broadcast emergency blood request.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            7-Step Emergency Blood Wizard
          </div>

          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider transition border border-indigo-200 shadow-2xs"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>Voice Intake</span>
          </button>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Create Emergency Blood Request
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Step-by-step verified emergency dispatch. Our matching engine alerts qualified voluntary
          donors progressively across expanding radius tiers.
        </p>

        {draftSavedToast && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full shadow-xs">
            <Check className="w-3.5 h-3.5" />
            <span>Emergency draft auto-saved</span>
          </div>
        )}

        {!isAuthenticated && (
          <div className="flex items-start sm:items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-left text-xs text-amber-800">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Guest Mode:</strong> You can prepare this requisition now. You will be prompted to sign in before broadcast. Your draft is safely auto-saved.
              </span>
            </div>
            <Link
              to="/login?redirect=/patient/create-request"
              onClick={() => saveDraft()}
              className="inline-flex items-center gap-1 font-bold text-amber-900 underline hover:text-amber-700 whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </div>

      {/* Progress Stepper Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Step {currentStep} of 7: {STEPS[currentStep - 1].title}
          </span>
          <span className="text-xs font-black text-rose-600">
            {Math.round((currentStep / 7) * 100)}% Completed
          </span>
        </div>

        {/* Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-4">
          <div
            className="bg-rose-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / 7) * 100}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="grid grid-cols-7 gap-1">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (s.id < currentStep) setCurrentStep(s.id);
              }}
              disabled={s.id > currentStep}
              className={`text-left p-1 rounded-lg transition-colors ${
                s.id === currentStep
                  ? 'text-rose-600 font-bold'
                  : s.id < currentStep
                  ? 'text-slate-800 font-semibold cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <span className="text-[10px] block truncate hidden sm:block">
                {s.id}. {s.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Wizard Form Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Step 1: Blood Group */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Droplet className="w-5 h-5 text-rose-600" />
                Step 1: Which Blood Group is Needed?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select the exact patient blood type. Our engine will check exact match and universal
                compatibility rules.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {BLOOD_GROUPS_LIST.map((b) => (
                <button
                  key={b.group}
                  type="button"
                  onClick={() => setBloodGroup(b.group)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    bloodGroup === b.group
                      ? 'bg-rose-50 border-rose-600 ring-2 ring-rose-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-2xl font-black text-slate-900 block">{b.label}</span>
                  <span className="text-[11px] font-medium text-slate-500 mt-1 block">
                    {b.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Units Required */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-600" />
                Step 2: How Many Blood Units Are Needed?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Standard whole blood donation is ~350–450ml per unit. Select the attending doctor's
                prescribed requirement.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {[1, 2, 3, 4, 5, 6].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnitsRequired(u)}
                  className={`w-14 h-14 rounded-2xl font-black text-lg border transition-all cursor-pointer ${
                    unitsRequired === u
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Or enter custom quantity (units)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={unitsRequired}
                onChange={(e) => setUnitsRequired(Math.max(1, Number(e.target.value)))}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 font-bold"
              />
            </div>
          </div>
        )}

        {/* Step 3: Urgency & Clinical Triage */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-600" />
                Step 3: Clinical Urgency Level
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Specifies broadcast speed and notification priority to nearby registered donors.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setUrgency('CRITICAL')}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  urgency === 'CRITICAL'
                    ? 'bg-rose-50 border-rose-600 ring-2 ring-rose-500'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Critical
                </div>
                <div className="text-sm font-bold text-slate-900">Emergency / Trauma / ICU</div>
                <p className="text-xs text-slate-500 mt-1">
                  Required within 2 hours. Triggers instant multi-radius broadcast.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setUrgency('HIGH')}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  urgency === 'HIGH'
                    ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-500'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase mb-2">
                  High
                </div>
                <div className="text-sm font-bold text-slate-900">Urgent Surgery</div>
                <p className="text-xs text-slate-500 mt-1">
                  Required within 12–24 hours for scheduled procedure.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setUrgency('NORMAL')}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  urgency === 'NORMAL'
                    ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500 text-white text-[10px] font-bold uppercase mb-2">
                  Normal
                </div>
                <div className="text-sm font-bold text-slate-900">Standard Transfusion</div>
                <p className="text-xs text-slate-500 mt-1">
                  Required within 48 hours. Routine non-critical matching.
                </p>
              </button>
            </div>

            {/* AI Triage Helper */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Medical Context / Diagnosis Reason
                </label>
                <button
                  type="button"
                  onClick={handleAiTriage}
                  disabled={aiLoading || !medicalReason.trim()}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {aiLoading ? 'Analyzing...' : 'AI Urgency Triage Helper'}
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="e.g. Acute anemia, emergency trauma surgery in OT 3."
                value={medicalReason}
                onChange={(e) => setMedicalReason(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white"
              />
              {aiAnalysis && (
                <div className="p-3 bg-white border border-rose-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-rose-900">
                    AI Suggested Urgency: {aiAnalysis.urgency} ({Math.round(aiAnalysis.confidence * 100)}% confidence)
                  </div>
                  <p className="text-slate-600">{aiAnalysis.reasoning}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Hospital Details */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Step 4: Hospital & Transfusion Facility
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Where should donors arrive to donate or deliver blood units?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hospital / Medical Center Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manipal Hospital, Whitefield"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Needed By (Date & Time) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={requiredBy}
                  onChange={(e) => setRequiredBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Location Details */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-600" />
                Step 5: Hospital City & Location
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Used to calculate geographic distance and progressive search tiers (5km → 100km).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengaluru"
                  value={hospitalCity}
                  onChange={(e) => setHospitalCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karnataka"
                  value={hospitalState}
                  onChange={(e) => setHospitalState(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Hospital Address & Ward / Bed Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HAL Airport Road, 3rd Floor, ICU Bed 14"
                  value={hospitalAddress}
                  onChange={(e) => setHospitalAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Patient & Contact Info */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-600" />
                Step 6: Patient & On-Site Coordinator
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Provide reliable attendant contact details. Contact is unlocked when a donor accepts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Age & Gender</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={110}
                    value={patientAge}
                    onChange={(e) => setPatientAge(Number(e.target.value))}
                    className="w-20 px-3 py-2.5 text-sm rounded-xl border border-slate-300"
                  />
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-slate-300"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attendant / Coordinator Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikas Sharma (Brother)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Emergency Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special Notes for Donors (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Replacement donor accepted. Blood bank on 1st floor."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Confirmation & Review */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Step 7: Verify Details & Confirm Broadcast
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Please double-check all clinical and hospital details before activating the emergency broadcast.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Blood Group & Units:</span>
                <span className="text-sm font-black text-rose-600">
                  {bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-')} ({unitsRequired} unit(s))
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Urgency Triage:</span>
                <span className="text-sm font-black text-slate-900">{urgency}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Hospital & Venue:</span>
                <span className="text-xs font-bold text-slate-800">
                  {hospitalName}, {hospitalCity}, {hospitalState}
                </span>
                <span className="text-slate-500 block">{hospitalAddress}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Patient & Coordinator:</span>
                <span className="text-xs font-bold text-slate-800">
                  {patientName} ({patientAge}y, {patientGender})
                </span>
                <span className="text-slate-500 block">
                  {contactName} ({contactPhone})
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Truth-in-Emergency Assurance
              </div>
              <p className="text-amber-800 leading-relaxed">
                By submitting, an emergency broadcast will initiate. This request will be counted in
                RakthaSethu's real-time statistics only as a genuine database record.
              </p>
            </div>

            {!isAuthenticated && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-3">
                <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-800">Authentication Required to Broadcast Request</div>
                  <p className="text-rose-700 leading-relaxed">
                    Emergency broadcasts dispatch notifications directly to verified blood donors and hospitals. You need to be signed in to confirm and broadcast. Clicking "Confirm & Broadcast Request" will prompt you to log in with your draft preserved.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 7 ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-lg shadow-rose-900/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Broadcasting Emergency...' : 'Confirm & Broadcast Request'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Realistic Progressive Radius Matching Overlay */}
      {isSearchingNearby && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-800 text-center text-white space-y-5 shadow-2xl">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-600 opacity-60" />
              <div className="relative w-20 h-20 rounded-full bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/50">
                <Compass className="w-10 h-10 text-white animate-spin" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black">Progressive Donor Discovery</h3>
              <p className="text-xs text-slate-400 mt-1">
                Searching verified voluntary donors within {SEARCH_RADII[searchRadiusIndex]} km of{' '}
                {hospitalName || 'hospital'}...
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Tier 1 (5 km):</span>
                <span className="font-bold text-emerald-400">Scanning local donors</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Tier 2 (7 km – 10 km):</span>
                <span className="font-bold text-slate-400">Expanded search buffer</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Privacy Mode:</span>
                <span className="font-bold text-blue-400">Geofuzzing enabled</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Broadcasting alerts to compatible {bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-')} donors...
            </p>
          </div>
        </div>
      )}

      {/* Voice Requisition Modal */}
      <VoiceRequestModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onConfirmExtracted={handleVoiceExtracted}
      />

      {/* Authentication Required Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">Sign In to Broadcast Request</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Emergency requisitions must be authenticated to prevent counterfeit alerts and protect donors. Your draft for{' '}
                <strong>
                  {patientName || 'Patient'} ({unitsRequired} unit(s) of {bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-')})
                </strong>{' '}
                has been safely saved.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  saveDraft(7);
                  navigate('/login?redirect=/patient/create-request');
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In & Continue Requisition</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  saveDraft(7);
                  navigate('/register?redirect=/patient/create-request');
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm transition cursor-pointer"
              >
                <span>Create New Account</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition cursor-pointer"
              >
                Return to Review Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
