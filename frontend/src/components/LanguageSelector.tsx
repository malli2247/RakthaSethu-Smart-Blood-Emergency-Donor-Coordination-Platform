import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SupportedLanguage } from '../i18n/translations';

interface LanguageSelectorProps {
  variant?: 'header' | 'drawer' | 'compact' | 'segmented';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { language, supportedLanguages, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentMeta = supportedLanguages.find((l) => l.code === language) || supportedLanguages[0];

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 ${className}`}>
        {supportedLanguages.map((l) => {
          const isSelected = l.code === language;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => handleSelect(l.code)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isSelected
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {l.nativeName}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'drawer') {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-rose-500" />
          {t('selectLanguage')} (English / हिन्दी / తెలుగు)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {supportedLanguages.map((l) => {
            const isSelected = l.code === language;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => handleSelect(l.code)}
                className={`flex flex-col items-center justify-center p-2.5 text-xs rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-rose-600 text-white font-bold border-rose-600 shadow-sm'
                    : 'bg-white/5 border-slate-700/60 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="font-semibold">{l.nativeName}</span>
                <span className="text-[10px] opacity-75">{l.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('selectLanguage')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
      >
        <Globe className="w-3.5 h-3.5 text-rose-600" />
        <span className="font-bold">{currentMeta.nativeName}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('language')}
          </div>
          <div className="py-1">
            {supportedLanguages.map((l) => {
              const isSelected = l.code === language;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleSelect(l.code)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-rose-50 text-rose-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{l.nativeName}</span>
                    <span className="text-[11px] text-slate-400">({l.name})</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-rose-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
