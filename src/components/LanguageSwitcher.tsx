
'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const isSpanish = locale === 'es';

  const toggleLanguage = () => {
    setLocale(isSpanish ? 'en' : 'es');
  };

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="language-switch" className="text-sm cursor-pointer">
        {isSpanish ? t('languageSwitcherLabelEN') : t('languageSwitcherLabelES')}
      </Label>
      <Switch
        id="language-switch"
        checked={isSpanish}
        onCheckedChange={toggleLanguage}
        aria-label={t('languageToggleARIALabel')}
      />
    </div>
  );
}
