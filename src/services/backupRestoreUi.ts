import type { BackupPreview } from "./lifeosApi";

type CleanupPreview = {
  backupsDeleted: number;
  auditLogsDeleted: number;
  chatSessionsDeleted: number;
  messagesDeleted: number;
};

export type CleanupPolicyInput = {
  backupKeepCount: number;
  auditOlderThanDays: number;
  chatOlderThanDays: number;
};

export type CleanupPolicyResult =
  | { ok: true; options: CleanupPolicyInput; error?: never }
  | { ok: false; error: string; options?: never };

export function formatBackupTableSummary(tables: BackupPreview["tables"]) {
  return Object.entries(tables).map(([table, count]) => `${table}: ${count ?? "-"}`).join("\n");
}

export function buildRestoreConfirmMessage(backupFile: string, preview: Pick<BackupPreview, "tables">) {
  return `安排恢复备份 ${backupFile}？\n\n备份预览：\n${formatBackupTableSummary(preview.tables)}\n\n系统会先创建恢复前备份，然后在下次启动前替换当前 SQLite。`;
}

export function formatCleanupSummary(cleanup: CleanupPreview) {
  return `预计删除 ${cleanup.backupsDeleted} 个备份、${cleanup.auditLogsDeleted} 条审计、${cleanup.chatSessionsDeleted} 个会话、${cleanup.messagesDeleted} 条消息。`;
}

export function buildCleanupPolicyOptions(input: CleanupPolicyInput): CleanupPolicyResult {
  const backupKeepCount = Number(input.backupKeepCount);
  const auditOlderThanDays = Number(input.auditOlderThanDays);
  const chatOlderThanDays = Number(input.chatOlderThanDays);
  if (!Number.isFinite(backupKeepCount) || backupKeepCount < 1) {
    return { ok: false, error: "备份保留数量至少为 1。" };
  }
  if (!Number.isFinite(auditOlderThanDays) || auditOlderThanDays < 0 || !Number.isFinite(chatOlderThanDays) || chatOlderThanDays < 0) {
    return { ok: false, error: "清理天数不能小于 0。设置为 0 表示不清理该类数据。" };
  }
  return {
    ok: true,
    options: {
      backupKeepCount,
      auditOlderThanDays,
      chatOlderThanDays,
    },
  };
}

export function buildCleanupConfirmMessage({
  backupKeepCount,
  auditOlderThanDays,
  chatOlderThanDays,
  cleanup,
}: {
  backupKeepCount: number;
  auditOlderThanDays: number;
  chatOlderThanDays: number;
  cleanup: CleanupPreview;
}) {
  const auditLabel = auditOlderThanDays > 0 ? `${auditOlderThanDays} 天前审计日志` : "不清理审计日志";
  const chatLabel = chatOlderThanDays > 0 ? `${chatOlderThanDays} 天前聊天会话` : "不清理聊天会话";
  return `清理旧数据？将保留最新 ${backupKeepCount} 份备份；审计策略：${auditLabel}；聊天策略：${chatLabel}。\n\n${formatCleanupSummary(cleanup)}`;
}
