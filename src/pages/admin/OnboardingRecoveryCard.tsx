import { useI18n } from "../../i18n/I18nProvider";

type RecoveryAction = "logs" | "copyLogs" | "copyAddress" | "diagnostics";

type OnboardingRecoveryCardProps = {
  busy: string | null;
  desktopBridgeAvailable: boolean;
  onDesktopRecoveryAction: (action: RecoveryAction) => void;
};

export default function OnboardingRecoveryCard({ busy, desktopBridgeAvailable, onDesktopRecoveryAction }: OnboardingRecoveryCardProps) {
  const { t } = useI18n();
  return (
    <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs leading-relaxed text-zinc-400">
      <div className="font-bold text-zinc-200">{t("onboarding.recoveryTitle")}</div>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        <li>{t("onboarding.recoveryLogs")}</li>
        <li>{t("onboarding.recoveryPairing")}</li>
        <li>{t("onboarding.recoveryConnection")}</li>
      </ul>
      {desktopBridgeAvailable ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onDesktopRecoveryAction("copyAddress")}
            disabled={Boolean(busy)}
            className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-left font-bold text-emerald-100 disabled:opacity-50"
          >
            {busy === "desktop-copyAddress" ? t("onboarding.copyingLocalAddress") : t("onboarding.copyLocalAddress")}
          </button>
          <button
            type="button"
            onClick={() => onDesktopRecoveryAction("logs")}
            disabled={Boolean(busy)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-left font-bold text-zinc-200 disabled:opacity-50"
          >
            {busy === "desktop-logs" ? t("onboarding.openingLogs") : t("onboarding.openLogsFolder")}
          </button>
          <button
            type="button"
            onClick={() => onDesktopRecoveryAction("copyLogs")}
            disabled={Boolean(busy)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-left font-bold text-zinc-200 disabled:opacity-50"
          >
            {busy === "desktop-copyLogs" ? t("onboarding.copyingLogsPath") : t("onboarding.copyLogsPath")}
          </button>
          <button
            type="button"
            onClick={() => onDesktopRecoveryAction("diagnostics")}
            disabled={Boolean(busy)}
            className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-left font-bold text-cyan-100 disabled:opacity-50"
          >
            {busy === "desktop-diagnostics" ? t("onboarding.exportingDiagnostics") : t("onboarding.exportDiagnostics")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
