import React, { useState, useEffect } from 'react';
import { donorApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { User, Heart, MapPin, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { BloodGroup } from '../../types';

export const DonorProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O_POSITIVE');
  const [gender, setGender] = useState('MALE');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [emergencyAvailable, setEmergencyAvailable] = useState(true);
  const [hidePhoneNumber, setHidePhoneNumber] = useState(false);
  const [hideExactAddress, setHideExactAddress] = useState(true);

  useEffect(() => {
    donorApi
      .getProfile()
      .then((res) => {
        const d = res.data?.data;
        if (d) {
          setProfile(d);
          setFullName(d.fullName);
          setBloodGroup(d.bloodGroup);
          setGender(d.gender);
          setCity(d.city);
          setState(d.state);
          setAddress(d.address);
          setIsAvailable(d.isAvailable);
          setEmergencyAvailable(d.emergencyAvailable);
          setHidePhoneNumber(d.hidePhoneNumber);
          setHideExactAddress(d.hideExactAddress);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await donorApi.updateProfile({
        fullName,
        bloodGroup,
        gender,
        city,
        state,
        address,
        isAvailable,
        emergencyAvailable,
        hidePhoneNumber,
        hideExactAddress,
      });
      setMessage('Profile settings updated successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to update profile');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-64 bg-white rounded-2xl animate-pulse" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Donor Profile & Privacy Settings</h1>
        <p className="text-xs text-slate-500">
          Manage your availability, personal info, and contact privacy preferences.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Legal Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Blood Group *</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold text-rose-700"
            >
              <option value="O_NEGATIVE">O- (Universal Donor)</option>
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
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Gender *</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">City *</label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">State *</label>
            <input
              type="text"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Area / Address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>
        </div>

        {/* Availability & Emergency */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Donation Availability Preferences</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">General Availability</span>
                <span className="text-[11px] text-slate-500">
                  Allow platform to match you with routine and high priority requests.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyAvailable}
                onChange={(e) => setEmergencyAvailable(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Critical Emergency Readiness
                </span>
                <span className="text-[11px] text-slate-500">
                  Receive high-priority alerts for life-threatening acute hemorrhage/trauma cases.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Contact & Location Privacy
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={hidePhoneNumber}
                onChange={(e) => setHidePhoneNumber(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Mask Phone Number</span>
                <span className="text-[11px] text-slate-500">
                  Only show phone number to the hospital after you explicitly accept.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={hideExactAddress}
                onChange={(e) => setHideExactAddress(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Hide Exact Address</span>
                <span className="text-[11px] text-slate-500">
                  Show approximate city & radius instead of house/street number.
                </span>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition-colors"
        >
          {saving ? 'Saving changes...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
};
