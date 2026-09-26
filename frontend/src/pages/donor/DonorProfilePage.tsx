import React, { useState, useEffect } from 'react';
import { donorApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { User, Heart, MapPin, ShieldCheck, CheckCircle2, AlertCircle, Phone, ShieldAlert, Lock } from 'lucide-react';
import { BloodGroup } from '../../types';
import { OtpVerificationModal } from '../../components/auth/OtpVerificationModal';

export const DonorProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O_POSITIVE');
  const [gender, setGender] = useState('MALE');
  const [phone, setPhone] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [emergencyAvailable, setEmergencyAvailable] = useState(true);
  const [hidePhoneNumber, setHidePhoneNumber] = useState(false);
  const [hideExactAddress, setHideExactAddress] = useState(true);

  const loadProfile = () => {
    donorApi
      .getProfile()
      .then((res) => {
        const d = res.data?.data;
        if (d) {
          setProfile(d);
          setFullName(d.fullName);
          setBloodGroup(d.bloodGroup);
          setGender(d.gender);
          setPhone(d.user?.phone || '');
          setIsVerified(Boolean(d.isPhoneVerified || d.user?.isPhoneVerified));
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
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await donorApi.updateProfile({
        fullName,
        bloodGroup,
        gender,
        phone,
        city,
        state,
        address,
        isAvailable,
        emergencyAvailable,
        hidePhoneNumber,
        hideExactAddress,
      });
      setMessage('Profile settings updated successfully!');
      loadProfile();
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

        {/* Mobile Number & OTP Verification */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-rose-600" />
              Registered Mobile Number & Verification
            </h3>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ✓ Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                ⚠ Not verified
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Primary Mobile Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setIsVerified(false);
                }}
                placeholder="+91 98765 43210"
                className="w-full max-w-sm px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white"
              />
              {!isVerified && (
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  Verify your mobile number to receive blood-request notifications and participate in donor matching.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={!phone || phone.length < 10}
              onClick={() => setOtpModalOpen(true)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                isVerified
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
              }`}
            >
              {isVerified ? 'Re-verify with OTP' : 'Verify via OTP'}
            </button>
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

      <OtpVerificationModal
        phone={phone}
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        onVerified={() => {
          setIsVerified(true);
          loadProfile();
          setMessage('Mobile number verified successfully via OTP!');
          setTimeout(() => setMessage(null), 3000);
        }}
      />
    </div>
  );
};
