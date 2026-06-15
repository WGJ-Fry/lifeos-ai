import { insertAuditLog } from "./audit";
import { getClientState, setClientState } from "./clientState";
import { createDatabaseBackup } from "./db";

const BACKUP_SCHEDULE_KEY = "lifeos_backup_schedule";
let schedulerStarted = false;
let schedulerTimer: NodeJS.Timeout | undefined;

export type BackupSchedule = {
  enabled: boolean;
  intervalHours: number;
  lastRunAt?: number;
  nextRunAt?: number;
  updatedAt?: number;
};

function normalizeSchedule(value: any): BackupSchedule {
  const intervalHours = Number.isFinite(Number(value?.intervalHours))
    ? Math.min(Math.max(Number(value.intervalHours), 1), 720)
    : 24;
  const lastRunAt = Number.isFinite(Number(value?.lastRunAt)) ? Number(value.lastRunAt) : undefined;
  const nextRunAt = Number.isFinite(Number(value?.nextRunAt)) ? Number(value.nextRunAt) : undefined;
  return {
    enabled: Boolean(value?.enabled),
    intervalHours,
    lastRunAt,
    nextRunAt,
    updatedAt: Number.isFinite(Number(value?.updatedAt)) ? Number(value.updatedAt) : undefined,
  };
}

function computeNextRun(now: number, intervalHours: number, lastRunAt?: number) {
  return (lastRunAt || now) + intervalHours * 60 * 60 * 1000;
}

export function getBackupSchedule(): BackupSchedule {
  const state = getClientState(BACKUP_SCHEDULE_KEY);
  const schedule = normalizeSchedule(state?.value);
  if (schedule.enabled && !schedule.nextRunAt) {
    schedule.nextRunAt = computeNextRun(Date.now(), schedule.intervalHours, schedule.lastRunAt);
  }
  return schedule;
}

export function updateBackupSchedule(input: Partial<BackupSchedule>, actor?: { type: string; id: string }) {
  const previous = getBackupSchedule();
  const now = Date.now();
  const next: BackupSchedule = {
    enabled: input.enabled ?? previous.enabled,
    intervalHours: Math.min(Math.max(Number(input.intervalHours ?? previous.intervalHours ?? 24), 1), 720),
    lastRunAt: input.lastRunAt ?? previous.lastRunAt,
    updatedAt: now,
  };
  next.nextRunAt = next.enabled ? computeNextRun(now, next.intervalHours, next.lastRunAt) : undefined;
  setClientState(BACKUP_SCHEDULE_KEY, next, actor);
  insertAuditLog("backup_schedule_updated", "database", "backup-schedule", {
    enabled: next.enabled,
    intervalHours: next.intervalHours,
    nextRunAt: next.nextRunAt,
  }, actor?.type || "system", actor?.id);
  return next;
}

export function runDueBackupSchedule(now = Date.now()) {
  const schedule = getBackupSchedule();
  if (!schedule.enabled || !schedule.nextRunAt || schedule.nextRunAt > now) return null;

  const backup = createDatabaseBackup();
  const next: BackupSchedule = {
    ...schedule,
    lastRunAt: now,
    nextRunAt: computeNextRun(now, schedule.intervalHours, now),
    updatedAt: now,
  };
  setClientState(BACKUP_SCHEDULE_KEY, next, { type: "system", id: "backup-scheduler" });
  insertAuditLog("scheduled_backup_created", "database", backup.file, {
    size: backup.size,
    intervalHours: schedule.intervalHours,
    nextRunAt: next.nextRunAt,
    redaction: backup.redaction,
    ordinaryBackupExcludesSecrets: true,
  });
  return { backup, schedule: next };
}

export function startBackupScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  schedulerTimer = setInterval(() => {
    try {
      runDueBackupSchedule();
    } catch (error) {
      insertAuditLog("scheduled_backup_failed", "database", "backup-schedule", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, 60 * 1000);
  schedulerTimer.unref?.();
}

export function stopBackupSchedulerForTests() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = undefined;
  schedulerStarted = false;
}
