import type { OfflineMessageConflictGroup, OfflineMessageConflictResolutionOption } from "../../services/offlineMessageQueue";
import { useI18n } from "../../i18n/I18nProvider";

export default function MobileOfflineQueueConflictCard({
  groups,
  onResolveGroup,
}: {
  groups: OfflineMessageConflictGroup[];
  onResolveGroup: (group: OfflineMessageConflictGroup, option: OfflineMessageConflictResolutionOption) => void;
}) {
  const { t } = useI18n();
  if (!groups.length) return null;
  return (
    <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-500/10 p-3 text-xs leading-relaxed text-orange-100">
      <div className="font-bold">{t("offlineQueue.conflictReviewTitle", { count: groups.length })}</div>
      <p className="mt-1 opacity-85">{t("offlineQueue.conflictReviewBody")}</p>
      <div className="mt-3 space-y-2">
        {groups.slice(0, 3).map((group) => (
          <div key={group.fingerprint} className="rounded-xl border border-orange-200/15 bg-black/15 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate font-bold text-orange-50">{group.preview}</div>
              <span className="shrink-0 rounded-full border border-orange-200/20 bg-orange-200/10 px-2 py-0.5 text-[10px] font-bold">
                {t(`offlineQueue.conflictKind.${group.kind}` as any)}
              </span>
            </div>
            <div className="mt-1 text-[11px] opacity-75">
              {t("offlineQueue.conflictGroupMeta", {
                count: group.count,
                first: new Date(group.firstQueuedAt).toLocaleString(),
                latest: new Date(group.lastQueuedAt).toLocaleString(),
              })}
            </div>
            <div className="mt-1 text-[11px] opacity-75">
              {t(group.reasonKey as any, { devices: group.sourceDeviceCount, entries: group.sourceEntryCount })}
            </div>
            <div className="mt-2 grid gap-2">
              {group.reviewRequired ? (
                <div className="rounded-xl border border-orange-200/15 bg-orange-200/10 px-3 py-2 text-[11px] font-bold text-orange-50">
                  {t("offlineQueue.conflictManualReview")}
                </div>
              ) : null}
              {group.resolutionOptions.slice(0, 3).map((option) => (
                <button
                  key={option.id}
                  aria-label={t("offlineQueue.resolveConflictAria", { preview: group.preview })}
                  onClick={() => onResolveGroup(group, option)}
                  className={`rounded-xl border px-3 py-2 text-left font-bold ${
                    option.recommended
                      ? "border-orange-200/25 bg-orange-200/15 text-orange-50"
                      : "border-orange-200/15 bg-black/15 text-orange-100"
                  }`}
                >
                  <span className="block text-[11px]">{t(option.labelKey as any)}</span>
                  <span className="mt-0.5 block text-[10px] font-medium opacity-75">
                    {t(option.bodyKey as any, { count: option.removeIds.length })}
                  </span>
                  {option.requiresBackup ? (
                    <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                      {t("offlineQueue.conflictBackupRequired")}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {groups.length > 3 ? <div className="mt-2 text-[11px] opacity-75">{t("offlineQueue.conflictMore", { count: groups.length - 3 })}</div> : null}
    </div>
  );
}
