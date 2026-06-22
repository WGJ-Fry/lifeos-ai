import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("backup schedule creates due backups, stores next run, and can be run immediately by an admin", async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "lifeos-backup-schedule-test-"));
  process.env.LIFEOS_DATA_DIR = dataDir;
  t.after(async () => {
    const { stopBackupSchedulerForTests } = await import(`../server/backupSchedule.ts?cleanup=${Date.now()}`);
    stopBackupSchedulerForTests();
    await rm(dataDir, { recursive: true, force: true });
  });

  const scheduleModule = await import(`../server/backupSchedule.ts?test=${Date.now()}`);
  const dbModule = await import(`../server/db.ts?test=${Date.now()}`);
  const auditModule = await import(`../server/audit.ts?test=${Date.now()}`);

  assert.throws(() => scheduleModule.runBackupScheduleNow({ type: "admin", id: "owner" }), /disabled/);

  const now = Date.now();
  const saved = scheduleModule.updateBackupSchedule({
    enabled: true,
    intervalHours: 1,
    lastRunAt: now - 2 * 60 * 60 * 1000,
  }, { type: "admin", id: "owner" });
  assert.equal(saved.enabled, true);
  assert.equal(saved.intervalHours, 1);

  const due = scheduleModule.runDueBackupSchedule(now);
  assert.ok(due?.backup.file.startsWith("lifeos-"));

  const schedule = scheduleModule.getBackupSchedule();
  assert.equal(schedule.enabled, true);
  assert.equal(schedule.lastRunAt, now);
  assert.equal(schedule.nextRunAt, now + 60 * 60 * 1000);

  const backups = dbModule.listBackups();
  assert.ok(backups.some((backup) => backup.file === due.backup.file));

  const runNowAt = now + 10_000;
  const result = scheduleModule.runBackupScheduleNow({ type: "admin", id: "owner" }, runNowAt);
  assert.ok(result.backup.file.startsWith("lifeos-"));
  assert.equal(result.schedule.lastRunAt, runNowAt);
  assert.equal(result.schedule.nextRunAt, runNowAt + 60 * 60 * 1000);
  assert.ok(dbModule.listBackups().some((backup) => backup.file === result.backup.file));

  const audit = auditModule.listAuditLogs(20).find((log) => log.action === "scheduled_backup_run_now");
  assert.equal(audit.actorType, "admin");
  assert.equal(audit.actorId, "owner");
  assert.equal(audit.metadata.manual, true);
  assert.equal(audit.metadata.ordinaryBackupExcludesSecrets, true);
});
