import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, SupportedLanguage, SUPPORTED_LANGUAGES, LanguageMeta } from '../i18n/translations';

interface LanguageContextType {
  language: SupportedLanguage;
  supportedLanguages: LanguageMeta[];
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('rakthasethu_lang') as SupportedLanguage;
    if (saved && translations[saved]) {
      return saved;
    }
    return 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    if (translations[lang]) {
      setLanguageState(lang);
      localStorage.setItem('rakthasethu_lang', lang);
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.en;
    let text = dict[key] || translations.en[key] || key;

    if (params) {
      for (const [paramKey, val] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      }
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, supportedLanguages: SUPPORTED_LANGUAGES, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
