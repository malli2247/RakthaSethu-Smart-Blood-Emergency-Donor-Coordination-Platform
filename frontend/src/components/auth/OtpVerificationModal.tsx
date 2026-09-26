import React, { useState, useEffect, useRef } from 'react';
import { authApi } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { ShieldCheck, Phone, CheckCircle2, AlertCircle, RefreshCw, X, Lock } from 'lucide-react';

interface OtpVerificationModalProps {
  phone: string;
  isOpen: boolean;
  onClose: () => void;
  onVerified: (verifiedPhone: string) => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  phone,
  isOpen,
  onClose,
  onVerified,
}) => {
  const { t } = useLanguage();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send initial OTP when opened
  useEffect(() => {
    if (isOpen && phone) {
      setDigits(['', '', '', '', '', '']);
      setError(null);
      setSuccess(null);
      handleSendOtp();
    }
  }, [isOpen, phone]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await authApi.sendOtp(phone);
      setSuccess('Verification OTP sent successfully.');
      setCooldown(res.data?.data?.cooldownSeconds || 30);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to dispatch verification OTP.');
      if (err.response?.data?.data?.cooldownSeconds) {
        setCooldown(err.response.data.data.cooldownSeconds);
      }
    } finally {
      setSending(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setError(null);

    // Auto-advance to next box
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await authApi.verifyOtp(phone, otp);
      setSuccess('Mobile number verified successfully!');
      setTimeout(() => {
        onVerified(phone);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const maskedDisplay =
    phone.length >= 10
      ? `${phone.slice(0, 3)} ${phone.slice(3, 7)}****`
      : phone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{t('verifyMobileTitle')}</h2>
          <p className="text-xs text-slate-500">
            We sent a 6-digit verification code to{' '}
            <strong className="text-slate-800">{maskedDisplay}</strong>.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          {/* 6-digit input boxes */}
          <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-slate-50 text-slate-900 shadow-2xs"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || digits.join('').length !== 6}
            className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-md shadow-rose-200 transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            {loading ? t('loading') : t('verifyOtp')}
          </button>

          {/* Resend Cooldown */}
          <div className="text-center pt-2">
            {cooldown > 0 ? (
              <span className="text-xs text-slate-400 font-medium">
                {t('resendIn', { seconds: cooldown })}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sending}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1.5 focus:outline-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sending ? 'animate-spin' : ''}`} />
                {t('resendOtp')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
