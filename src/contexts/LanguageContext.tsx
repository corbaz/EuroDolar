
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Locale as DateFnsLocale } from 'date-fns';
import { enUS as enUSLocale, es as esLocale } from 'date-fns/locale';
import enTranslations from '@/locales/en.json';
import esTranslations from '@/locales/es.json';

export type AppLocale = 'en' | 'es';
type Translations = typeof enTranslations; // Assume EN has all keys

interface LanguageContextType {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: keyof Translations, replacements?: Record<string, string | number | undefined>) => string;
  dateLocale: DateFnsLocale;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const availableTranslations: Record<AppLocale, Translations> = {
  en: enTranslations,
  es: esTranslations,
};

const dateLocales: Record<AppLocale, DateFnsLocale> = {
  en: enUSLocale,
  es: esLocale,
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en'); // Default to English

  useEffect(() => {
    const storedLocale = localStorage.getItem('appLocale') as AppLocale | null;
    if (storedLocale && availableTranslations[storedLocale]) {
      setLocaleState(storedLocale);
    }
    // Set initial document lang attribute
    document.documentElement.lang = storedLocale || 'en';
  }, []);

  const setLocale = useCallback((newLocale: AppLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem('appLocale', newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback((key: keyof Translations, replacements?: Record<string, string | number | undefined>): string => {
    let translation = availableTranslations[locale]?.[key] || availableTranslations['en']?.[key] || String(key); // Fallback chain
    if (replacements) {
      Object.keys(replacements).forEach(rKey => {
        const value = replacements[rKey];
        translation = translation.replace(`{{${rKey}}}`, String(value !== undefined ? value : ''));
      });
    }
    return translation;
  }, [locale]);
  
  useEffect(() => {
    document.title = t('pageTitleGlobal');
  }, [t, locale]);

  const dateLocale = dateLocales[locale] || enUSLocale;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dateLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
