import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("backup schedule creates due backups and stores next run", async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "lifeos-backup-schedule-test-"));
  process.env.LIFEOS_DATA_DIR = dataDir;
  t.after(async () => {
    const { stopBackupSchedulerForTests } = await import(`../server/backupSchedule.ts?cleanup=${Date.now()}`);
    stopBackupSchedulerForTests();
    await rm(dataDir, { recursive: true, force: true });
  });

  const scheduleModule = await import(`../server/backupSchedule.ts?test=${Date.now()}`);
  const dbModule = await import(`../server/db.ts?test=${Date.now()}`);

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
});
