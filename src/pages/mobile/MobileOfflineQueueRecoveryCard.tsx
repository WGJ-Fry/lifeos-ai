import { AlertTriangle, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import type { OfflineMessageQueueRecoverySummary } from "../../services/offlineMessageQueue";

type MobileOfflineQueueRecoveryCardProps = {
  recovery: OfflineMessageQueueRecoverySummary;
  onRetryFailed: () => void;
  onRemoveFailed: () => void;
};

export default function MobileOfflineQueueRecoveryCard({
  recovery,
  onRetryFailed,
  onRemoveFailed,
}: MobileOfflineQueueRecoveryCardProps) {
  const { t } = useI18n();
  const failedCount = recovery.failedIds.length;
  const tone = recovery.state === "healthy"
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
    : recovery.state === "blocked"
      ? "border-red-400/25 bg-red-500/10 text-red-100"
      : "border-amber-400/25 bg-amber-500/10 text-amber-100";
  const Icon = recovery.state === "healthy" ? CheckCircle2 : AlertTriangle;

  return (
    <section className={`mt-4 rounded-[24px] border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/15 bg-black/10">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">{t("offlineQueue.recoveryCardTitle")}</div>
          <h2 className="mt-1 text-base font-bold">{t(recovery.titleKey as any)}</h2>
          <p className="mt-1 text-sm leading-relaxed opacity-85">{t(recovery.bodyKey as any)}</p>
          <p className="mt-2 text-xs leading-relaxed opacity-75">{t(recovery.actionKey as any)}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <Metric label={t("mobileDevice.failed")} value={failedCount} />
        <Metric label={t("mobileDevice.conflicts")} value={recovery.conflictGroupCount} />
        <Metric label={t("offlineQueue.recoveryInterrupted")} value={recovery.interruptedIds.length} />
        <Metric label={t("offlineQueue.recoveryWaiting")} value={recovery.waitingCount} />
      </div>
      {recovery.nextRetryAt ? (
        <div className="mt-3 rounded-2xl border border-current/15 bg-black/10 p-3 text-xs opacity-85">
          {t("offlineQueue.recoveryNextRetry", { time: new Date(recovery.nextRetryAt).toLocaleString() })}
        </div>
      ) : null}
      <div className="mt-3 rounded-2xl border border-current/15 bg-black/10 p-3 text-xs leading-relaxed">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold">{t("offlineQueue.syncPlanTitle")}</span>
          <span className="rounded-full border border-current/15 px-2 py-0.5 text-[10px] font-bold uppercase opacity-75">
            {t(`offlineQueue.syncPlan.mode.${recovery.syncPlan.mode}` as any)}
          </span>
        </div>
        <div className="mt-1 font-bold opacity-90">{t(recovery.syncPlan.reasonKey as any)}</div>
        <div className="mt-1 opacity-75">{t(recovery.syncPlan.detailKey as any)}</div>
        {recovery.syncPlan.nextAttemptAt ? (
          <div className="mt-2 opacity-70">{t("offlineQueue.syncPlanNextAttempt", { time: new Date(recovery.syncPlan.nextAttemptAt).toLocaleString() })}</div>
        ) : null}
      </div>
      {recovery.steps.length ? (
        <div className="mt-3 space-y-2">
          {recovery.steps.slice(0, 4).map((step) => (
            <div key={step.id} className="rounded-2xl border border-current/15 bg-black/10 p-3 text-xs leading-relaxed">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{t(step.titleKey as any)}</span>
                <span className="rounded-full border border-current/15 px-2 py-0.5 text-[10px] font-bold uppercase opacity-75">
                  {t(`offlineQueue.recoveryStepStatus.${step.status}` as any)}
                </span>
              </div>
              <div className="mt-1 opacity-75">{t(step.bodyKey as any, { count: step.itemCount || 0 })}</div>
            </div>
          ))}
        </div>
      ) : null}
      {recovery.multiSourceRisk || recovery.sourceSnapshotMissing ? (
        <div className="mt-3 rounded-2xl border border-current/15 bg-black/10 p-3 text-xs leading-relaxed opacity-85">
          {t("offlineQueue.recoverySourceSummary", {
            devices: recovery.sourceDeviceCount || 0,
            entries: recovery.sourceEntryCount || 0,
            missing: recovery.sourceSnapshotMissing || 0,
          })}
        </div>
      ) : null}
      {failedCount > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button onClick={onRetryFailed} className="inline-flex items-center justify-center gap-2 rounded-xl border border-current/15 bg-black/10 px-3 py-2 text-xs font-bold">
            <RefreshCw className="h-4 w-4" />
            {t("offlineQueue.retryFailedBatch", { count: failedCount })}
          </button>
          <button onClick={onRemoveFailed} className="inline-flex items-center justify-center gap-2 rounded-xl border border-current/15 bg-black/10 px-3 py-2 text-xs font-bold">
            <Trash2 className="h-4 w-4" />
            {t("offlineQueue.removeFailed", { count: failedCount })}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-current/15 bg-black/10 px-2 py-2">
      <div className="text-lg font-black">{value}</div>
      <div className="mt-0.5 truncate opacity-70">{label}</div>
    </div>
  );
}
