import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '../types';
import { translations, TranslationKeys } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  getLocalizedField: <T extends Record<string, unknown>>(obj: T, field: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('orzutech_language');
    return (saved as Language) || 'uz';
  });

  useEffect(() => {
    localStorage.setItem('orzutech_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = translations[language];

  const getLocalizedField = <T extends Record<string, unknown>>(obj: T, field: string): string => {
    const key = `${field}_${language}` as keyof T;
    return (obj[key] as string) || (obj[`${field}_en` as keyof T] as string) || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getLocalizedField }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
