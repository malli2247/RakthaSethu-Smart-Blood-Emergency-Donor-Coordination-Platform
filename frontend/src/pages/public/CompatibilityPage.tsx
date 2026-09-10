import React, { useState } from 'react';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { Check, X, Info, Heart, ShieldAlert, Sparkles } from 'lucide-react';

const BLOOD_GROUPS = [
  'O_NEGATIVE',
  'O_POSITIVE',
  'A_NEGATIVE',
  'A_POSITIVE',
  'B_NEGATIVE',
  'B_POSITIVE',
  'AB_NEGATIVE',
  'AB_POSITIVE',
];

const LABELS: Record<string, string> = {
  O_NEGATIVE: 'O-',
  O_POSITIVE: 'O+',
  A_NEGATIVE: 'A-',
  A_POSITIVE: 'A+',
  B_NEGATIVE: 'B-',
  B_POSITIVE: 'B+',
  AB_NEGATIVE: 'AB-',
  AB_POSITIVE: 'AB+',
};

// RBC Matrix: canDonate(donor, recipient)
function canDonate(donor: string, recipient: string): boolean {
  if (donor === 'O_NEGATIVE') return true;
  if (recipient === 'AB_POSITIVE') return true;

  if (donor === 'O_POSITIVE') {
    return ['O_POSITIVE', 'A_POSITIVE', 'B_POSITIVE', 'AB_POSITIVE'].includes(recipient);
  }
  if (donor === 'A_NEGATIVE') {
    return ['A_NEGATIVE', 'A_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'].includes(recipient);
  }
  if (donor === 'A_POSITIVE') {
    return ['A_POSITIVE', 'AB_POSITIVE'].includes(recipient);
  }
  if (donor === 'B_NEGATIVE') {
    return ['B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'].includes(recipient);
  }
  if (donor === 'B_POSITIVE') {
    return ['B_POSITIVE', 'AB_POSITIVE'].includes(recipient);
  }
  if (donor === 'AB_NEGATIVE') {
    return ['AB_NEGATIVE', 'AB_POSITIVE'].includes(recipient);
  }
  if (donor === 'AB_POSITIVE') {
    return recipient === 'AB_POSITIVE';
  }
  return false;
}

export const CompatibilityPage: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState('O_NEGATIVE');

  const canDonateToGroups = BLOOD_GROUPS.filter((g) => canDonate(activeGroup, g));
  const canReceiveFromGroups = BLOOD_GROUPS.filter((g) => canDonate(g, activeGroup));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
          <Heart className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
          Clinical Red Blood Cell Guide
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Blood Compatibility Calculator & Matrix
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Understanding transfusion compatibility saves lives during acute trauma and scheduled
          surgeries. Select your blood group below to see who you can donate to and receive from.
        </p>
      </div>

      {/* Interactive Blood Selector */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
            Select Your Blood Group
          </label>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setActiveGroup(bg)}
                className={`px-4 sm:px-6 py-3 rounded-xl font-extrabold text-sm sm:text-base transition-all ${
                  activeGroup === bg
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 scale-105 ring-4 ring-rose-100'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {LABELS[bg]}
              </button>
            ))}
          </div>
        </div>

        {/* Results Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          {/* Can Donate To */}
          <div className="p-6 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-rose-900">
                You ({LABELS[activeGroup]}) Can Donate To:
              </span>
              <span className="text-xs font-extrabold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                {canDonateToGroups.length} Blood Groups
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {canDonateToGroups.map((g) => (
                <div
                  key={g}
                  className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 font-extrabold text-sm flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  {LABELS[g]}
                </div>
              ))}
            </div>
            {activeGroup === 'O_NEGATIVE' && (
              <div className="p-3 rounded-xl bg-rose-600 text-white text-xs font-semibold flex items-center gap-2 shadow-sm">
                <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
                <span>
                  You are a Universal Red Blood Cell Donor! Your blood can be given to anyone in
                  critical emergencies.
                </span>
              </div>
            )}
          </div>

          {/* Can Receive From */}
          <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-900">
                You ({LABELS[activeGroup]}) Can Receive From:
              </span>
              <span className="text-xs font-extrabold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                {canReceiveFromGroups.length} Blood Groups
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {canReceiveFromGroups.map((g) => (
                <div
                  key={g}
                  className="px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 font-extrabold text-sm flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  {LABELS[g]}
                </div>
              ))}
            </div>
            {activeGroup === 'AB_POSITIVE' && (
              <div className="p-3 rounded-xl bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm">
                <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
                <span>
                  You are a Universal Red Blood Cell Recipient! You can receive blood from any blood
                  group.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 8x8 Compatibility Grid Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Complete Red Blood Cell Matrix</h2>
            <p className="text-xs text-slate-500">
              Rows represent Donor Blood Group; Columns represent Recipient Blood Group.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1 text-emerald-700">
              <Check className="w-4 h-4 text-emerald-600" /> Compatible
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <X className="w-4 h-4 text-slate-300" /> Incompatible
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 text-left font-bold text-slate-600 uppercase text-[11px]">
                  Donor \ Recipient
                </th>
                {BLOOD_GROUPS.map((bg) => (
                  <th key={bg} className="p-3 font-extrabold text-slate-900">
                    {LABELS[bg]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {BLOOD_GROUPS.map((donor) => (
                <tr
                  key={donor}
                  className={`hover:bg-rose-50/40 transition-colors ${
                    activeGroup === donor ? 'bg-rose-50/60 font-bold' : ''
                  }`}
                >
                  <td className="p-3 text-left font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs">
                      {LABELS[donor]}
                    </span>
                  </td>
                  {BLOOD_GROUPS.map((rec) => {
                    const compatible = canDonate(donor, rec);
                    return (
                      <td key={rec} className="p-3">
                        {compatible ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-200">
                            <X className="w-3.5 h-3.5 text-slate-300" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
