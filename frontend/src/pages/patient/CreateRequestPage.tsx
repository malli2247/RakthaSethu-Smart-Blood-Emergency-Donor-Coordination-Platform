import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { requestsApi, aiApi } from '../../services/api';
import { BloodGroup, UrgencyLevel } from '../../types';
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
  ShieldCheck,
} from 'lucide-react';

export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<number>(35);
  const [patientGender, setPatientGender] = useState('MALE');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(
    (searchParams.get('bloodGroup') as BloodGroup) || 'O_POSITIVE'
  );
  const [unitsRequired, setUnitsRequired] = useState<number>(1);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalCity, setHospitalCity] = useState(searchParams.get('city') || '');
  const [hospitalState, setHospitalState] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [requiredBy, setRequiredBy] = useState(
    new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [urgency, setUrgency] = useState<UrgencyLevel>('NORMAL');
  const [medicalReason, setMedicalReason] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await requestsApi.create({
        patientName,
        patientAge: Number(patientAge),
        patientGender,
        bloodGroup,
        unitsRequired: Number(unitsRequired),
        hospitalName,
        hospitalCity,
        hospitalState,
        hospitalAddress,
        requiredBy: new Date(requiredBy).toISOString(),
        urgency,
        medicalReason,
        contactName,
        contactPhone,
        additionalNotes,
      });

      const newRequestId = res.data?.data?.id;
      navigate(`/patient/requests/${newRequestId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to broadcast emergency blood request.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          Immediate Emergency Broadcast
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Create Emergency Blood Request
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Our real-time matching engine instantly notifies qualified voluntary donors and blood
          banks in your hospital's vicinity.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8"
      >
        {/* Section 1: Clinical & Blood Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-600 fill-rose-500" />
            1. Patient & Blood Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Patient Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ananya Deshmukh"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Patient Age</label>
              <input
                type="number"
                min={1}
                max={110}
                value={patientAge}
                onChange={(e) => setPatientAge(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Patient Gender</label>
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Required Blood Group *
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold text-rose-700"
              >
                <option value="O_NEGATIVE">O- (Can receive only O-)</option>
                <option value="O_POSITIVE">O+</option>
                <option value="A_POSITIVE">A+</option>
                <option value="A_NEGATIVE">A-</option>
                <option value="B_POSITIVE">B+</option>
                <option value="B_NEGATIVE">B-</option>
                <option value="AB_POSITIVE">AB+ (Universal Recipient)</option>
                <option value="AB_NEGATIVE">AB-</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Units Required *</label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={unitsRequired}
                onChange={(e) => setUnitsRequired(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Emergency Urgency Level *
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold"
              >
                <option value="CRITICAL">CRITICAL (Immediate Trauma / ICU)</option>
                <option value="HIGH">HIGH (Surgery within 24 hours)</option>
                <option value="NORMAL">NORMAL (Scheduled Transfusion)</option>
              </select>
            </div>
          </div>

          {/* Medical Reason & AI Triage Helper */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Medical Context / Clinical Reason
              </label>
              <button
                type="button"
                onClick={handleAiTriage}
                disabled={aiLoading || !medicalReason.trim()}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {aiLoading ? 'Analyzing Clinical Notes...' : 'AI Urgency Triage Helper'}
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="e.g. Acute internal hemorrhage following accident, emergency surgery in OT 4."
              value={medicalReason}
              onChange={(e) => setMedicalReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
            />

            {aiAnalysis && (
              <div className="mt-2 p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-rose-900">
                  <span>AI Recommended Urgency: {aiAnalysis.urgency}</span>
                  <span className="text-[10px] text-slate-500">
                    Confidence: {Math.round(aiAnalysis.confidence * 100)}%
                  </span>
                </div>
                <p className="text-slate-600">{aiAnalysis.reasoning}</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Hospital & Location */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            2. Hospital & Transfusion Venue
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Hospital Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apollo Specialty Hospital"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Needed By *</label>
              <input
                type="datetime-local"
                required
                value={requiredBy}
                onChange={(e) => setRequiredBy(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
              <input
                type="text"
                required
                placeholder="e.g. New Delhi"
                value={hospitalCity}
                onChange={(e) => setHospitalCity(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
              <input
                type="text"
                required
                placeholder="e.g. Delhi"
                value={hospitalState}
                onChange={(e) => setHospitalState(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hospital Address *</label>
              <input
                type="text"
                required
                placeholder="Wing / Ward / Bed number"
                value={hospitalAddress}
                onChange={(e) => setHospitalAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Contact Person */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            3. On-Site Point of Contact
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Deshmukh (Attendant)"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="+91 98119 98877"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Additional Instructions</label>
            <input
              type="text"
              placeholder="e.g. Please bring blood donation card if you have one."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm sm:text-base shadow-lg shadow-rose-200 transition-colors flex items-center justify-center gap-2"
        >
          <span>{submitting ? 'Broadcasting Emergency Alert...' : 'Broadcast Emergency Blood Request'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
