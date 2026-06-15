import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCleanupConfirmMessage,
  buildCleanupPolicyOptions,
  buildRestoreConfirmMessage,
  formatBackupTableSummary,
  formatCleanupSummary,
} from "../src/services/backupRestoreUi.ts";

const preview = {
  tables: {
    devices: 2,
    messages: 42,
    schema_migrations: 3,
  },
};

test("backup restore UI formats restore previews consistently", () => {
  assert.equal(formatBackupTableSummary(preview.tables), "devices: 2\nmessages: 42\nschema_migrations: 3");
  assert.equal(
    buildRestoreConfirmMessage("lifeos-backup.db", preview),
    "安排恢复备份 lifeos-backup.db？\n\n备份预览：\ndevices: 2\nmessages: 42\nschema_migrations: 3\n\n系统会先创建恢复前备份，然后在下次启动前替换当前 SQLite。",
  );
});

test("backup restore UI formats cleanup previews and confirmations consistently", () => {
  const cleanup = {
    backupsDeleted: 1,
    auditLogsDeleted: 2,
    chatSessionsDeleted: 3,
    messagesDeleted: 4,
  };
  assert.equal(formatCleanupSummary(cleanup), "预计删除 1 个备份、2 条审计、3 个会话、4 条消息。");
  assert.equal(
    buildCleanupConfirmMessage({
      backupKeepCount: 20,
      auditOlderThanDays: 180,
      chatOlderThanDays: 0,
      cleanup,
    }),
    "清理旧数据？将保留最新 20 份备份；审计策略：180 天前审计日志；聊天策略：不清理聊天会话。\n\n预计删除 1 个备份、2 条审计、3 个会话、4 条消息。",
  );
});

test("backup restore UI validates cleanup policy before API calls", () => {
  assert.deepEqual(
    buildCleanupPolicyOptions({ backupKeepCount: 20, auditOlderThanDays: 180, chatOlderThanDays: 0 }),
    { ok: true, options: { backupKeepCount: 20, auditOlderThanDays: 180, chatOlderThanDays: 0 } },
  );
  assert.deepEqual(
    buildCleanupPolicyOptions({ backupKeepCount: 0, auditOlderThanDays: 180, chatOlderThanDays: 365 }),
    { ok: false, error: "备份保留数量至少为 1。" },
  );
  assert.deepEqual(
    buildCleanupPolicyOptions({ backupKeepCount: 1, auditOlderThanDays: -1, chatOlderThanDays: 365 }),
    { ok: false, error: "清理天数不能小于 0。设置为 0 表示不清理该类数据。" },
  );
});
