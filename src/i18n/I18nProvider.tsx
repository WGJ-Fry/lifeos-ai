import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, localeLabels, translations } from "./translations";
import type { Locale, TranslationKey } from "./translations";

type TranslationValues = Record<string, string | number | boolean | null | undefined>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  localeLabels: Record<Locale, string>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function normalizeLocale(value: string | null | undefined): Locale {
  if (value === "en-US" || value?.toLowerCase().startsWith("en")) return "en-US";
  if (value === "zh-CN" || value?.toLowerCase().startsWith("zh")) return "zh-CN";
  return DEFAULT_LOCALE;
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY) || window.navigator.language);
}

function interpolate(template: string, values?: TranslationValues) {
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readInitialLocale());

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: TranslationKey, values?: TranslationValues) => {
    const template = translations[locale][key] || translations[DEFAULT_LOCALE][key] || key;
    return interpolate(template, values);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t, localeLabels }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}
