import React, { useState, useEffect } from 'react';
import { donorApi } from '../../services/api';
import {
  User,
  Heart,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  ChevronDown,
  Save,
  Bell,
  Lock,
} from 'lucide-react';
import { BloodGroup } from '../../types';
import { OtpVerificationModal } from '../../components/auth/OtpVerificationModal';
import { useLanguage } from '../../contexts/LanguageContext';

export const DonorProfilePage: React.FC = () => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Collapsible accordion state for mobile
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true,
    contact: true,
    verification: true,
    preferences: true,
    privacy: false,
    notifications: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Rare blood matching consent
  const [rareBloodConsent, setRareBloodConsent] = useState(true);
  const [criticalAlertsEnabled, setCriticalAlertsEnabled] = useState(true);

  const loadProfile = () => {
    donorApi
      .getProfile()
      .then((res) => {
        const d = res.data?.data;
        if (d) {
          setProfile(d);
          setFullName(d.fullName || '');
          setBloodGroup(d.bloodGroup || 'O_POSITIVE');
          setGender(d.gender || 'MALE');
          setPhone(d.user?.phone || '');
          setIsVerified(Boolean(d.isPhoneVerified || d.user?.isPhoneVerified));
          setCity(d.city || '');
          setState(d.state || '');
          setAddress(d.address || '');
          setIsAvailable(d.isAvailable !== false);
          setEmergencyAvailable(d.emergencyAvailable !== false);
          setHidePhoneNumber(Boolean(d.hidePhoneNumber));
          setHideExactAddress(d.hideExactAddress !== false);
          setRareBloodConsent(d.rareBloodMatchingConsent !== false);
          setCriticalAlertsEnabled(d.criticalAlertsEnabled !== false);
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
        rareBloodMatchingConsent: rareBloodConsent,
        criticalAlertsEnabled,
      });
      setMessage('Profile settings updated successfully!');
      loadProfile();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || t('somethingWentWrong'));
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-28 bg-white rounded-3xl animate-pulse" />
        <div className="h-64 bg-white rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {t('profile')} & {t('settings')}
        </h1>
        <p className="text-xs text-slate-500">
          Manage your personal details, verified mobile, and confidential privacy preferences.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* ============================================================ */}
        {/* SECTION 1: PERSONAL INFORMATION */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('personal')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t('personalInfo')}</h3>
                <p className="text-[11px] text-slate-500">Name, legal identity, and blood group</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.personal ? 'rotate-180' : ''}`} />
          </button>

          {openSections.personal && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Blood Group *</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 focus:bg-white font-bold text-rose-700"
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
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 focus:bg-white"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: CONTACT & LOCATION */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('contact')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t('contactInfo')}</h3>
                <p className="text-[11px] text-slate-500">City, regional perimeter, and general address</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.contact ? 'rotate-180' : ''}`} />
          </button>

          {openSections.contact && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">City / District *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">General Vicinity / Area *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: MOBILE VERIFICATION */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('verification')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  {t('verificationSection')}
                  {isVerified ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      ⚠ Unverified
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">OTP-verified mobile number for emergency notifications</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.verification ? 'rotate-180' : ''}`} />
          </button>

          {openSections.verification && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                  className="w-full max-w-sm px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 focus:bg-white"
                />
              </div>

              <button
                type="button"
                disabled={!phone || phone.length < 10}
                onClick={() => setOtpModalOpen(true)}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer touch-target flex items-center justify-center ${
                  isVerified
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                }`}
              >
                {isVerified ? 'Re-verify OTP' : t('verifyOtp')}
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION 4: DONATION PREFERENCES */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('preferences')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Donation Availability Preferences</h3>
                <p className="text-[11px] text-slate-500">General matching queue and trauma readiness</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.preferences ? 'rotate-180' : ''}`} />
          </button>

          {openSections.preferences && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{t('availableToDonate')}</span>
                  <span className="text-[11px] text-slate-500">
                    Allow platform to match you with routine requests.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emergencyAvailable}
                  onChange={(e) => setEmergencyAvailable(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Critical Emergency Readiness</span>
                  <span className="text-[11px] text-slate-500">
                    Receive high-priority alerts for life-threatening acute hemorrhage cases.
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION 5: PRIVACY & RARE BLOOD CONSENT */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('privacy')}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t('privacyPreferences')}</h3>
                <p className="text-[11px] text-slate-500">Anti-triangulation, location masking, and rare blood consent</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.privacy ? 'rotate-180' : ''}`} />
          </button>

          {openSections.privacy && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 mt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hidePhoneNumber}
                    onChange={(e) => setHidePhoneNumber(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Mask Phone Number</span>
                    <span className="text-[11px] text-slate-500">
                      Only reveal phone to coordinator after you accept.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideExactAddress}
                    onChange={(e) => setHideExactAddress(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Coarse Perimeter Only</span>
                    <span className="text-[11px] text-slate-500">
                      Never reveal exact street coordinates publicly.
                    </span>
                  </div>
                </label>
              </div>

              {/* Rare Blood Consent */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rareBloodConsent}
                    onChange={(e) => setRareBloodConsent(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-rose-950 block">{t('rareBloodConsent')}</span>
                    <span className="text-[11px] text-rose-800 leading-relaxed block mt-0.5">
                      {t('rareConsentDesc')}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Submit Save Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer touch-target"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? t('loading') : t('save')}</span>
          </button>
        </div>
      </form>

      <OtpVerificationModal
        phone={phone}
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        onVerified={() => {
          setIsVerified(true);
          loadProfile();
          setMessage(t('otpSuccessMessage'));
          setTimeout(() => setMessage(null), 3000);
        }}
      />
    </div>
  );
};
