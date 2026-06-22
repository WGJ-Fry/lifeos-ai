import type { BackupSchedule } from "../../../services/lifeosApi";
import { useI18n } from "../../../i18n/I18nProvider";

export function BackupScheduleCard({
  busy,
  schedule,
  scheduleEnabled,
  scheduleInterval,
  onRunNow,
  onSave,
  onToggleEnabled,
  onIntervalChange,
}: {
  busy: string | null;
  schedule: BackupSchedule | null;
  scheduleEnabled: boolean;
  scheduleInterval: number;
  onRunNow: () => void;
  onSave: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onIntervalChange: (intervalHours: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div id="backup-schedule" className="mb-4 scroll-mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-bold text-zinc-100">{t("backup.scheduleTitle")}</div>
          <div className="mt-1 text-xs text-zinc-500">
            {schedule?.enabled && schedule.nextRunAt
              ? t("backup.nextRun", { time: new Date(schedule.nextRunAt).toLocaleString() })
              : t("backup.scheduleOffHint")}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRunNow}
            disabled={Boolean(busy) || !schedule?.enabled}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "schedule-run-now" ? t("backup.runningScheduleNow") : t("backup.runScheduleNow")}
          </button>
          <button
            onClick={onSave}
            disabled={Boolean(busy)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "schedule" ? t("backup.saving") : t("backup.saveSchedule")}
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#060a10] px-3 py-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(event) => onToggleEnabled(event.target.checked)}
            className="h-4 w-4 accent-emerald-400"
          />
          {t("backup.enableSchedule")}
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#060a10] px-3 py-2 text-sm text-zinc-300">
          <span className="shrink-0 text-xs text-zinc-500">{t("backup.interval")}</span>
          <input
            type="number"
            min={1}
            max={720}
            value={scheduleInterval}
            onChange={(event) => onIntervalChange(Number(event.target.value))}
            className="min-w-0 flex-1 bg-transparent text-right font-mono outline-none"
          />
          <span className="shrink-0 text-xs text-zinc-500">{t("backup.hours")}</span>
        </label>
      </div>
      {schedule?.lastRunAt ? <div className="mt-2 text-xs text-zinc-500">{t("backup.lastRun", { time: new Date(schedule.lastRunAt).toLocaleString() })}</div> : null}
    </div>
  );
}
