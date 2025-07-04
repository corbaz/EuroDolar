
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

interface LanguageProviderProps {
  readonly children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Destructure useState directly as required by the linter
  const [locale, setLocale] = useState<AppLocale>('es'); // Default to Spanish

  // This function needs to be defined before it's used in the useEffect
  const setLocaleState = useCallback((storedLocale: AppLocale) => {
    if (Object.keys(availableTranslations).includes(storedLocale)) {
      setLocale(storedLocale);
      document.documentElement.lang = storedLocale;
    }
  }, []);

  useEffect(() => {
    const storedLocale = localStorage.getItem('appLocale') as AppLocale | null;
    if (storedLocale && availableTranslations[storedLocale]) {
      setLocaleState(storedLocale);
    }
    // Set initial document lang attribute
    document.documentElement.lang = storedLocale ?? 'en';
  }, [setLocaleState]);

  const handleSetLocale = useCallback((newLocale: AppLocale) => {
    setLocale(newLocale);
    localStorage.setItem('appLocale', newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback((key: keyof Translations, replacements?: Record<string, string | number | undefined>): string => {
    let translation = availableTranslations[locale]?.[key] || availableTranslations['en']?.[key] || String(key); // Fallback chain
    if (replacements) {
      Object.keys(replacements).forEach(rKey => {
        const value = replacements[rKey];
        translation = translation.replace(`{{${rKey}}}`, String(value ?? ''));
      });
    }
    return translation;
  }, [locale]);
  
  useEffect(() => {
    document.title = t('pageTitleGlobal');
  }, [t, locale]);

  const dateLocale = dateLocales[locale] || enUSLocale;

  const contextValue = useMemo(() => ({
    locale, 
    setLocale: handleSetLocale, 
    t, 
    dateLocale
  }), [locale, handleSetLocale, t, dateLocale]);

  return (
    <LanguageContext.Provider value={contextValue}>
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

