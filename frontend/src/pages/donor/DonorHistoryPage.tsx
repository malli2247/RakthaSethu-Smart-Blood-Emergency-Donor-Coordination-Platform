import React, { useState, useEffect } from 'react';
import { donorApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import {
  History,
  Droplets,
  Calendar,
  Building2,
  Award,
  PlusCircle,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';

export const DonorHistoryPage: React.FC = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [units, setUnits] = useState(1);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await donorApi.getHistory();
      setDonations(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await donorApi.recordDonation({
        hospitalName,
        donationDate,
        units,
        notes,
      });
      setMessage('Donation recorded and certificate code generated successfully!');
      setModalOpen(false);
      setHospitalName('');
      setNotes('');
      fetchHistory();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Error recording donation');
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Donation History & Certificates</h1>
          <p className="text-xs text-slate-500">
            Verified records of all your altruistic blood donations across partner healthcare
            facilities.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Record Past Donation
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : donations.length > 0 ? (
        <div className="space-y-4">
          {donations.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <BloodGroupBadge bloodGroup={d.bloodGroup} size="sm" />
                  <span className="text-xs font-black text-slate-900">
                    {d.units} Unit{d.units > 1 ? 's' : ''} Donated
                  </span>
                  <span className="text-[11px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Code: {d.certificateCode}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {d.hospital?.name || d.bloodBank?.name || 'Verified Blood Donation Center'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(d.donationDate).toLocaleDateString(undefined, {
                      dateStyle: 'long',
                    })}
                  </span>
                </div>

                {d.notes && <p className="text-xs text-slate-600 italic">{d.notes}</p>}
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  Life Saver Verified
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Droplets className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No Recorded Donations Yet</p>
          <p className="text-xs text-slate-400 mt-1">
            When you donate at a partner hospital, your certificate and history will automatically
            appear here.
          </p>
        </div>
      )}

      {/* Record Donation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Record a Completed Donation</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordDonation} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Hospital / Camp Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AIIMS Blood Bank, Apollo Hospital"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Donation Date *
                </label>
                <input
                  type="date"
                  required
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Units Donated *
                </label>
                <input
                  type="number"
                  min={1}
                  max={2}
                  required
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Voluntary blood drive at university"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition-colors"
              >
                Save Donation Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
