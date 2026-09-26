import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { SupportedLanguage } from '../i18n/translations';

interface LanguageSelectorProps {
  variant?: 'header' | 'drawer' | 'compact';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { language, supportedLanguages, setLanguage } = useLanguage();
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

  if (variant === 'drawer') {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-rose-500" />
          Select Language (భాష / भाषा)
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {supportedLanguages.map((l) => {
            const isSelected = l.code === language;
            return (
              <button
                key={l.code}
                onClick={() => handleSelect(l.code)}
                className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-rose-600 text-white font-bold border-rose-600 shadow-sm'
                    : 'bg-white/5 border-slate-700/60 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold">{l.nativeName}</div>
                  <div className="text-[10px] opacity-75">{l.name}</div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
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
        aria-label="Select Language"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20"
      >
        <Globe className="w-3.5 h-3.5 text-rose-600" />
        <span className="font-bold">{currentMeta.nativeName}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            11 Indian Languages Supported
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {supportedLanguages.map((l) => {
              const isSelected = l.code === language;
              return (
                <button
                  key={l.code}
                  onClick={() => handleSelect(l.code)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
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
