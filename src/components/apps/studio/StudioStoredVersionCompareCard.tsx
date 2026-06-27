import { useCallback, useEffect, useMemo, useState } from "react";
import { GitBranch, GitCompareArrows, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useI18n } from "../../../i18n/I18nProvider";
import {
  compareCustomAppVersions,
  listCustomAppVersions,
  type CustomAppVersionComparison,
  type StoredCustomAppVersion,
} from "../../../services/lifeosApi";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function versionLabel(version: StoredCustomAppVersion) {
  return `v${version.version}${version.note ? ` - ${version.note}` : ""}`;
}

function riskClasses(risk: CustomAppVersionComparison["risk"]) {
  if (risk === "high") return "text-red-300 bg-red-500/10 border-red-500/15";
  if (risk === "medium") return "text-amber-300 bg-amber-500/10 border-amber-500/15";
  return "text-emerald-300 bg-emerald-500/10 border-emerald-500/15";
}

function buildRepairInstruction(comparison: CustomAppVersionComparison, t: ReturnType<typeof useI18n>["t"]) {
  return t("studio.refine.storedRepairInstruction", {
    from: comparison.fromVersion,
    to: comparison.toVersion,
    risk: comparison.risk,
    notes: comparison.riskNotes.slice(0, 3).join("; "),
    checks: comparison.reviewChecklist.slice(0, 3).join("; "),
  });
}

export default function StudioStoredVersionCompareCard({
  appId,
  isApplyingRepair = false,
  onApplyRepair,
}: {
  appId?: string | null;
  isApplyingRepair?: boolean;
  onApplyRepair?: (instruction: string) => void;
}) {
  const { t } = useI18n();
  const [versions, setVersions] = useState<StoredCustomAppVersion[]>([]);
  const [fromVersion, setFromVersion] = useState<number | "">("");
  const [toVersion, setToVersion] = useState<number | "">("");
  const [comparison, setComparison] = useState<CustomAppVersionComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const riskLabel = useMemo(() => {
    if (!comparison) return "";
    return {
      low: t("studio.refine.compareRiskLow"),
      medium: t("studio.refine.compareRiskMedium"),
      high: t("studio.refine.compareRiskHigh"),
    }[comparison.risk];
  }, [comparison, t]);

  const loadDefaultComparison = useCallback(async () => {
    if (!appId) return;
    setIsLoading(true);
    setError(null);
    try {
      const versionResponse = await listCustomAppVersions(appId, 20);
      setVersions(versionResponse.versions);
      if (versionResponse.versions.length < 2) {
        setComparison(null);
        setFromVersion("");
        setToVersion("");
        return;
      }
      const target = versionResponse.versions[0].version;
      const source = versionResponse.versions.find((version) => version.version < target)?.version || versionResponse.versions[1].version;
      setFromVersion(source);
      setToVersion(target);
      const compareResponse = await compareCustomAppVersions(appId, source, target);
      setComparison(compareResponse.comparison);
    } catch (err: any) {
      setError(err?.message || t("studio.refine.storedCompareLoadFailed"));
      setComparison(null);
    } finally {
      setIsLoading(false);
    }
  }, [appId, t]);

  const runComparison = async () => {
    if (!appId || !fromVersion || !toVersion || fromVersion === toVersion) return;
    setIsLoading(true);
    setError(null);
    try {
      const compareResponse = await compareCustomAppVersions(appId, Number(fromVersion), Number(toVersion));
      setComparison(compareResponse.comparison);
    } catch (err: any) {
      setError(err?.message || t("studio.refine.storedCompareLoadFailed"));
      setComparison(null);
    } finally {
      setIsLoading(false);
    }
  };

  const applyRepair = () => {
    if (!comparison || !onApplyRepair) return;
    onApplyRepair(buildRepairInstruction(comparison, t));
  };

  useEffect(() => {
    void loadDefaultComparison();
  }, [loadDefaultComparison]);

  return (
    <div className="bg-[#141416] border border-white/[0.05] rounded-xl p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
            <GitBranch className="w-3.5 h-3.5 text-cyan-300" />
            <span>{t("studio.refine.storedCompareTitle")}</span>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            {t("studio.refine.storedCompareSubtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDefaultComparison()}
          disabled={isLoading || !appId}
          className="shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-40"
          aria-label={t("studio.refine.storedCompareRefresh")}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {versions.length >= 2 ? (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
          <select
            value={fromVersion}
            onChange={(event) => setFromVersion(Number(event.target.value))}
            className="min-w-0 rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5 text-[10px] text-zinc-300 outline-none"
            aria-label={t("studio.refine.storedCompareFrom")}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.version}>{versionLabel(version)}</option>
            ))}
          </select>
          <select
            value={toVersion}
            onChange={(event) => setToVersion(Number(event.target.value))}
            className="min-w-0 rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5 text-[10px] text-zinc-300 outline-none"
            aria-label={t("studio.refine.storedCompareTo")}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.version}>{versionLabel(version)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void runComparison()}
            disabled={isLoading || !fromVersion || !toVersion || fromVersion === toVersion}
            className="rounded-lg bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/15 disabled:opacity-40"
          >
            {t("studio.refine.storedCompareRun")}
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/[0.05] p-3 text-[10px] text-zinc-600 leading-relaxed">
          {isLoading ? t("studio.refine.storedCompareLoading") : t("studio.refine.storedCompareNotEnough")}
        </div>
      )}

      {error && <div className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/15 rounded-lg p-2">{error}</div>}

      {comparison && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] text-zinc-500 font-mono">
              v{comparison.fromVersion}{" -> "}v{comparison.toVersion}{" / "}{formatBytes(comparison.fromBytes)}{" -> "}{formatBytes(comparison.toBytes)}
            </div>
            <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${riskClasses(comparison.risk)}`}>
              {comparison.risk === "high" ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
              {riskLabel}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[
              [t("studio.refine.compareAdded"), comparison.addedLines, "text-emerald-300"],
              [t("studio.refine.compareChanged"), comparison.changedLines, "text-indigo-300"],
              [t("studio.refine.compareRemoved"), comparison.removedLines, "text-red-300"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="rounded-lg bg-black/20 border border-white/[0.04] px-2 py-2">
                <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
                <div className="text-[9px] text-zinc-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 text-[10px] text-zinc-500 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-zinc-400">
              <GitCompareArrows className="w-3 h-3" />
              {t("studio.refine.storedCompareServerChecklist")}
            </div>
            {comparison.riskNotes.slice(0, 2).map((note) => (
              <div key={note}>- {note}</div>
            ))}
            {comparison.reviewChecklist.slice(0, 2).map((item) => (
              <div key={item}>- {item}</div>
            ))}
          </div>

          {onApplyRepair && (
            <button
              type="button"
              onClick={applyRepair}
              disabled={isLoading || isApplyingRepair}
              className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-[10px] font-bold text-black hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              {isApplyingRepair ? t("studio.refine.storedRepairApplying") : t("studio.refine.storedRepairApply")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
