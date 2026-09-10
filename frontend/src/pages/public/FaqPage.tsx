import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, ShieldAlert } from 'lucide-react';

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Who is eligible to donate blood?',
      a: 'Healthy individuals between 18 and 65 years old, weighing at least 45-50 kg, with a hemoglobin level of 12.5 g/dL or higher. You must be free from active infectious illnesses, recent major surgeries, or fever.',
    },
    {
      q: 'How often can I donate blood?',
      a: 'For whole blood donations, men can safely donate every 90 days (3 months), and women every 120 days. Platelet donations (apheresis) can be done more frequently, up to every 2-4 weeks.',
    },
    {
      q: 'Is my personal contact information exposed publicly on RakthaSethu?',
      a: 'No! Your phone number, email address, and exact home address are masked by default. Only when you explicitly accept a blood request from a patient or certified hospital will your verified contact details be shared with that requester.',
    },
    {
      q: 'Why is O-negative blood so valuable?',
      a: 'O-negative red blood cells lack A, B, and Rh antigens, meaning they can be safely transfused to patients of ANY blood group in emergency trauma situations where there is no time for cross-matching.',
    },
    {
      q: 'Does RakthaSethu charge any money for blood or connecting donors?',
      a: 'Absolutely NOT. RakthaSethu is 100% voluntary, free, and humanitarian. Selling or commercializing human blood is strictly illegal and violates human rights.',
    },
    {
      q: 'What should I eat or drink before donating blood?',
      a: 'Drink plenty of water or healthy fluids (at least 500ml) 1-2 hours before donating. Have a nutritious light meal, avoid fatty or fried foods, and avoid alcohol for at least 24 hours prior to donation.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          Frequently Asked Questions
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Blood Donation & Platform FAQ
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Everything you need to know about donation eligibility, privacy, safety, and emergency
          workflows.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((f, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-5 text-left font-bold text-slate-900 flex items-center justify-between text-sm sm:text-base"
              >
                <span>{f.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Humanitarian Disclaimer */}
      <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-1">Medical Disclaimer:</strong>
          RakthaSethu is a humanitarian technology connector. We do not provide clinical medical
          diagnoses or treatments. Always consult registered medical professionals and licensed
          blood banks for transfusions and emergency interventions.
        </div>
      </div>
    </div>
  );
};
