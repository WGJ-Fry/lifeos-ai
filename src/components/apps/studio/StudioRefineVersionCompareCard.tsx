import { GitCompareArrows, ShieldAlert, ShieldCheck } from "lucide-react";
import { useI18n } from "../../../i18n/I18nProvider";
import type { StudioRefineHistoryItem } from "./StudioRefinePanel";

type Risk = "low" | "medium" | "high";

type CompareSummary = {
  added: number;
  removed: number;
  changed: number;
  total: number;
  risk: Risk;
};

function splitCode(code: string) {
  return String(code || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function compareCode(beforeCode: string, afterCode: string): CompareSummary {
  const beforeLines = splitCode(beforeCode);
  const afterLines = splitCode(afterCode);
  let added = 0;
  let removed = 0;
  let changed = 0;
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  for (let index = 0; index < maxLines; index += 1) {
    const before = beforeLines[index];
    const after = afterLines[index];
    if (before === after) continue;
    if (before === undefined) added += 1;
    else if (after === undefined) removed += 1;
    else changed += 1;
  }
  const total = added + removed + changed;
  const risk = deriveRisk(afterCode, total);
  return { added, removed, changed, total, risk };
}

function deriveRisk(code: string, totalChangedLines: number): Risk {
  if (/\beval\s*\(|\bFunction\s*\(|<script\b|\.innerHTML\s*=|javascript:|data:|file:|\b(?:tel|sms|shortcuts):/i.test(code)) {
    return "high";
  }
  if (/\bfetch\s*\(|XMLHttpRequest|WebSocket|window\.open\s*\(|requestAction|localStorage|sessionStorage|indexedDB|navigator\.clipboard/i.test(code)) {
    return "medium";
  }
  if (totalChangedLines >= 80) return "medium";
  return "low";
}

export default function StudioRefineVersionCompareCard({
  currentCode,
  refineHistory,
}: {
  currentCode: string;
  refineHistory: StudioRefineHistoryItem[];
}) {
  const { t } = useI18n();
  const latest = refineHistory[0];
  if (!latest) {
    return (
      <div className="border border-dashed border-white/[0.04] rounded-xl p-3 text-[10px] text-zinc-600 leading-relaxed">
        {t("studio.refine.compareEmpty")}
      </div>
    );
  }

  const summary = compareCode(latest.code, currentCode);
  const riskClass = summary.risk === "high"
    ? "text-red-300 bg-red-500/10 border-red-500/15"
    : summary.risk === "medium"
      ? "text-amber-300 bg-amber-500/10 border-amber-500/15"
      : "text-emerald-300 bg-emerald-500/10 border-emerald-500/15";
  const RiskIcon = summary.risk === "high" ? ShieldAlert : ShieldCheck;
  const riskLabel = {
    low: t("studio.refine.compareRiskLow"),
    medium: t("studio.refine.compareRiskMedium"),
    high: t("studio.refine.compareRiskHigh"),
  }[summary.risk];

  return (
    <div className="bg-[#141416] border border-white/[0.05] rounded-xl p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
            <GitCompareArrows className="w-3.5 h-3.5 text-indigo-300" />
            <span>{t("studio.refine.compareTitle")}</span>
          </div>
          <div className="text-[10px] text-zinc-500 truncate" title={latest.instruction}>
            {t("studio.refine.compareBase", { time: latest.timestamp })}
          </div>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${riskClass}`}>
          <RiskIcon className="w-3 h-3" />
          {riskLabel}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center">
        {[
          [t("studio.refine.compareAdded"), summary.added, "text-emerald-300"],
          [t("studio.refine.compareChanged"), summary.changed, "text-indigo-300"],
          [t("studio.refine.compareRemoved"), summary.removed, "text-red-300"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-lg bg-black/20 border border-white/[0.04] px-2 py-2">
            <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
            <div className="text-[9px] text-zinc-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 text-[10px] text-zinc-500 leading-relaxed">
        <div className="font-bold text-zinc-400">{t("studio.refine.compareChecklist")}</div>
        <div>{summary.risk === "high" ? t("studio.refine.compareHighAction") : t("studio.refine.compareNormalAction")}</div>
        <div>{t("studio.refine.compareRollbackHint")}</div>
      </div>
    </div>
  );
}
