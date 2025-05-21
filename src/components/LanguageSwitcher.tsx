"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageSwitcher() {
    const { locale, setLocale, t } = useLanguage();
    const isSpanish = locale === "es";

    const toggleLanguage = () => {
        setLocale(isSpanish ? "en" : "es");
    };

    return (
        <button
            onClick={toggleLanguage}
            className="bg-transparent border-none cursor-pointer text-primary hover:text-primary/80 font-medium transition-colors hover:underline px-2 py-1 text-sm focus:outline-none"
            aria-label={t("languageToggleARIALabel")}
        >
            {isSpanish
                ? t("languageSwitcherLabelEN")
                : t("languageSwitcherLabelES")}
        </button>
    );
}
