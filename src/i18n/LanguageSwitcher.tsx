import { Languages } from "lucide-react";
import { useI18n } from "./I18nProvider";
import type { Locale } from "./translations";

type LanguageSwitcherProps = {
  compact?: boolean;
};

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, localeLabels, t } = useI18n();

  return (
    <label className={`inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-300 ${compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"}`}>
      <Languages className={compact ? "h-3.5 w-3.5 text-cyan-300" : "h-4 w-4 text-cyan-300"} />
      <span className={compact ? "sr-only" : "font-bold"}>{t("common.language")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="bg-transparent text-inherit outline-none"
        aria-label={t("common.language")}
      >
        {(Object.keys(localeLabels) as Locale[]).map((item) => (
          <option key={item} value={item} className="bg-[#101722] text-zinc-100">
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
