import { useI18n } from "../../i18n/I18nProvider";
import type { OfflineMessageQueueSummary } from "../../services/offlineMessageQueue";

type MobileOfflineQueueRecoveryAttemptCardProps = {
  summary: OfflineMessageQueueSummary;
};

export default function MobileOfflineQueueRecoveryAttemptCard({ summary }: MobileOfflineQueueRecoveryAttemptCardProps) {
  const { t } = useI18n();
  if (!summary.lastRecoveryAttemptAt) return null;

  return (
    <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 text-xs leading-relaxed text-sky-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold">{t("offlineQueue.lastRecoveryAttemptTitle")}</div>
        <span className="rounded-full border border-sky-200/20 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-100/75">
          {t(`offlineQueue.recoveryResult.${summary.lastRecoveryAttemptResult || "blocked"}` as any)}
        </span>
      </div>
      <div className="mt-1 opacity-85">
        {t("offlineQueue.lastRecoveryAttemptBody", {
          time: new Date(summary.lastRecoveryAttemptAt).toLocaleString(),
          trigger: t(`offlineQueue.recoveryTrigger.${summary.lastRecoveryAttemptTrigger || "foreground"}` as any),
          mode: summary.lastRecoveryAttemptMode ? t(`offlineQueue.syncPlan.mode.${summary.lastRecoveryAttemptMode}` as any) : "-",
          ready: summary.lastRecoveryAttemptReadyCount ?? 0,
          total: summary.lastRecoveryAttemptQueueCount ?? 0,
          synced: summary.lastRecoveryAttemptSyncedCount ?? 0,
        })}
      </div>
      {summary.lastRecoveryAttemptReasonKey ? <div className="mt-1 opacity-75">{t(summary.lastRecoveryAttemptReasonKey as any)}</div> : null}
      {summary.lastRecoveryAttemptError ? (
        <div className="mt-2 rounded-xl border border-red-300/20 bg-red-500/10 p-2 text-red-100">
          {t("offlineQueue.lastRecoveryAttemptError", { message: summary.lastRecoveryAttemptError })}
        </div>
      ) : null}
    </div>
  );
}
