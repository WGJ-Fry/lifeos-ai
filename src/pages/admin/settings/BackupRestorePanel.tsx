import { useEffect, useState } from "react";
import { AlertTriangle, DatabaseBackup, Download, LockKeyhole, Plus, Sparkles, Upload, XCircle } from "lucide-react";
import { backupDownloadUrl, cancelPendingRestore, cleanupData, createBackup, dataExportDownloadUrl, exportEncryptedBackup, getBackupSchedule, importEncryptedBackup, listBackups, previewBackup, previewDataCleanup, restoreBackup, updateBackupSchedule } from "../../../services/lifeosApi";
import type { BackupPreview, BackupSchedule, DataExportScope, PendingRestore } from "../../../services/lifeosApi";
import { buildCleanupConfirmMessage, buildCleanupPolicyOptions, buildRestoreConfirmMessage, formatCleanupSummary } from "../../../services/backupRestoreUi";
import { BackupList } from "./BackupList";
import { BackupPreviewCard } from "./BackupPreviewCard";

type BackupItem = Awaited<ReturnType<typeof listBackups>>["backups"][number];
const dataExportScopeOptions: Array<{ id: DataExportScope; label: string }> = [
  { id: "chat", label: "聊天" },
  { id: "memories", label: "记忆" },
  { id: "devices", label: "设备" },
  { id: "auditLogs", label: "审计" },
];

export default function BackupRestorePanel({
  backups,
  pendingRestore,
  onChanged,
}: {
  backups: BackupItem[];
  pendingRestore: PendingRestore | null;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState(24);
  const [cleanupBackupKeepCount, setCleanupBackupKeepCount] = useState(20);
  const [cleanupAuditDays, setCleanupAuditDays] = useState(180);
  const [cleanupChatDays, setCleanupChatDays] = useState(365);
  const [cleanupPreview, setCleanupPreview] = useState<Awaited<ReturnType<typeof previewDataCleanup>>["cleanup"] | null>(null);
  const [exportScopes, setExportScopes] = useState<DataExportScope[]>(dataExportScopeOptions.map((option) => option.id));
  const [encryptionPassphrase, setEncryptionPassphrase] = useState("");
  const [importPassphrase, setImportPassphrase] = useState("");
  const exportHref = dataExportDownloadUrl(exportScopes);

  useEffect(() => {
    getBackupSchedule()
      .then((result) => {
        setSchedule(result.schedule);
        setScheduleEnabled(result.schedule.enabled);
        setScheduleInterval(result.schedule.intervalHours);
      })
      .catch((error) => setStatus(error.message || "加载自动备份计划失败"));
  }, []);

  const handleCreateBackup = async () => {
    setBusy("create");
    setStatus(null);
    try {
      const result = await createBackup();
      setStatus(`已创建备份：${result.backup.file}`);
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "创建备份失败");
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (backup: BackupItem) => {
    setBusy(`preview-${backup.file}`);
    setStatus(null);
    let backupPreview: BackupPreview | null = null;
    try {
      backupPreview = (await previewBackup(backup.file)).preview;
      setPreview(backupPreview);
    } catch (error: any) {
      setBusy(null);
      setStatus(error.message || "读取备份预览失败");
      return;
    }
    const confirmed = window.confirm(buildRestoreConfirmMessage(backup.file, backupPreview));
    if (!confirmed) {
      setBusy(null);
      return;
    }
    setBusy(backup.file);
    setStatus(null);
    try {
      const result = await restoreBackup(backup.file);
      setStatus(`已安排下次启动恢复。恢复前备份：${result.restore.preRestoreBackup.file}`);
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "安排恢复失败");
    } finally {
      setBusy(null);
    }
  };

  const handlePreview = async (backup: BackupItem) => {
    setBusy(`preview-${backup.file}`);
    setStatus(null);
    try {
      const result = await previewBackup(backup.file);
      setPreview(result.preview);
      setStatus(`已读取备份预览：${backup.file}`);
    } catch (error: any) {
      setStatus(error.message || "读取备份预览失败");
    } finally {
      setBusy(null);
    }
  };

  const handleCleanup = async () => {
    const cleanupPolicy = buildCleanupPolicyOptions({
      backupKeepCount: cleanupBackupKeepCount,
      auditOlderThanDays: cleanupAuditDays,
      chatOlderThanDays: cleanupChatDays,
    });
    if (!cleanupPolicy.ok) {
      setStatus(cleanupPolicy.error);
      return;
    }
    setBusy("cleanup");
    setStatus(null);
    try {
      const previewResult = await previewDataCleanup(cleanupPolicy.options);
      setCleanupPreview(previewResult.cleanup);
      if (!window.confirm(buildCleanupConfirmMessage({
        ...cleanupPolicy.options,
        cleanup: previewResult.cleanup,
      }))) {
        setBusy(null);
        return;
      }
      const result = await cleanupData(cleanupPolicy.options);
      setStatus(`清理完成：删除 ${result.cleanup.backupsDeleted} 个备份、${result.cleanup.auditLogsDeleted} 条审计、${result.cleanup.chatSessionsDeleted} 个会话。`);
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "清理失败");
    } finally {
      setBusy(null);
    }
  };

  const handlePreviewCleanup = async () => {
    const cleanupPolicy = buildCleanupPolicyOptions({
      backupKeepCount: cleanupBackupKeepCount,
      auditOlderThanDays: cleanupAuditDays,
      chatOlderThanDays: cleanupChatDays,
    });
    if (!cleanupPolicy.ok) {
      setStatus(cleanupPolicy.error);
      return;
    }
    setBusy("cleanup-preview");
    setStatus(null);
    try {
      const result = await previewDataCleanup(cleanupPolicy.options);
      setCleanupPreview(result.cleanup);
      setStatus(`清理预览：${formatCleanupSummary(result.cleanup)}`);
    } catch (error: any) {
      setStatus(error.message || "读取清理预览失败");
    } finally {
      setBusy(null);
    }
  };

  const handleCancelRestore = async () => {
    if (!window.confirm("取消等待重启执行的恢复任务？当前数据库不会被替换。")) return;
    setBusy("cancel-restore");
    setStatus(null);
    try {
      await cancelPendingRestore();
      setStatus("已取消等待重启的恢复任务。");
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "取消恢复任务失败");
    } finally {
      setBusy(null);
    }
  };

  const handleSaveSchedule = async () => {
    setBusy("schedule");
    setStatus(null);
    try {
      const result = await updateBackupSchedule({ enabled: scheduleEnabled, intervalHours: scheduleInterval });
      setSchedule(result.schedule);
      setStatus(result.schedule.enabled ? `自动备份已开启：每 ${result.schedule.intervalHours} 小时执行一次。` : "自动备份已关闭。");
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "保存自动备份计划失败");
    } finally {
      setBusy(null);
    }
  };

  const handleEncryptedExport = async (backup: BackupItem) => {
    if (encryptionPassphrase.length < 10) {
      setStatus("加密口令至少需要 10 个字符。");
      return;
    }
    setBusy(`encrypt-${backup.file}`);
    setStatus(null);
    try {
      const result = await exportEncryptedBackup(backup.file, encryptionPassphrase);
      const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = backup.file.replace(/\.db$/, ".lifeos-backup.json");
      link.click();
      URL.revokeObjectURL(url);
      setEncryptionPassphrase("");
      setStatus(`已生成加密备份：${link.download}`);
    } catch (error: any) {
      setStatus(error.message || "生成加密备份失败");
    } finally {
      setBusy(null);
    }
  };

  const handleEncryptedImport = async (file: File | null) => {
    if (!file) return;
    if (importPassphrase.length < 10) {
      setStatus("请输入至少 10 个字符的导入口令。");
      return;
    }
    setBusy("encrypted-import");
    setStatus(null);
    try {
      const payload = JSON.parse(await file.text());
      const result = await importEncryptedBackup(payload, importPassphrase);
      setPreview(result.preview);
      setImportPassphrase("");
      setStatus(`已导入加密备份：${result.backup.file}。请先预览，再手动点击恢复。`);
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "导入加密备份失败");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mb-6 rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold">
          <DatabaseBackup className="h-4 w-4 text-blue-300" />
          备份与恢复
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a
            href={exportHref}
            aria-disabled={!exportScopes.length}
            onClick={(event) => {
              if (!exportScopes.length) event.preventDefault();
            }}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${exportScopes.length ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200" : "pointer-events-none border-white/[0.08] bg-white/[0.03] text-zinc-500"}`}
          >
            <Download className="h-3.5 w-3.5" />
            导出数据
          </a>
          {backups[0] ? (
            <a href={backupDownloadUrl(backups[0].file)} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-white/[0.06]">
              <Download className="h-3.5 w-3.5" />
              下载最新
            </a>
          ) : null}
          <button
            onClick={handleCreateBackup}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {busy === "create" ? "创建中" : "创建备份"}
          </button>
        </div>
      </div>

      {pendingRestore ? (
        <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
            <div>
              <div className="font-bold">恢复任务等待重启</div>
              <div className="mt-1 text-amber-100/75">
                将在下次启动前恢复 {pendingRestore.restoredFrom}。恢复前备份：{pendingRestore.preRestoreBackup.file}。
              </div>
              <button
                onClick={handleCancelRestore}
                disabled={Boolean(busy)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-2 text-xs font-bold text-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                {busy === "cancel-restore" ? "取消中" : "取消恢复任务"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm leading-relaxed text-zinc-400">
          恢复前会自动创建当前数据库备份，恢复动作会在下次启动前执行。建议在升级、开启公网访问、批量导入数据前先创建一次备份。
        </div>
      )}

      {status ? <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-zinc-300">{status}</div> : null}

      <div id="backup-schedule" className="mb-4 scroll-mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-zinc-100">数据导出范围</div>
            <div className="mt-1 text-xs text-zinc-500">按需要导出聊天、记忆、设备或审计日志。敏感字段仍会脱敏。</div>
          </div>
          <button
            type="button"
            onClick={() => setExportScopes(dataExportScopeOptions.map((option) => option.id))}
            className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200"
          >
            全选
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {dataExportScopeOptions.map((option) => (
            <label key={option.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#060a10] px-3 py-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={exportScopes.includes(option.id)}
                onChange={(event) => {
                  setExportScopes((current) => event.target.checked
                    ? Array.from(new Set([...current, option.id]))
                    : current.filter((scope) => scope !== option.id));
                }}
                className="h-4 w-4 accent-cyan-400"
              />
              {option.label}
            </label>
          ))}
        </div>
        <div className="mt-2 truncate font-mono text-xs text-cyan-200">{exportHref}</div>
      </div>

      <div className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-zinc-100">自动备份计划</div>
            <div className="mt-1 text-xs text-zinc-500">
              {schedule?.enabled && schedule.nextRunAt
                ? `下次执行：${new Date(schedule.nextRunAt).toLocaleString()}`
                : "关闭时不会自动创建备份。"}
            </div>
          </div>
          <button
            onClick={handleSaveSchedule}
            disabled={Boolean(busy)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "schedule" ? "保存中" : "保存计划"}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#060a10] px-3 py-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(event) => setScheduleEnabled(event.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
            开启自动备份
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#060a10] px-3 py-2 text-sm text-zinc-300">
            <span className="shrink-0 text-xs text-zinc-500">间隔</span>
            <input
              type="number"
              min={1}
              max={720}
              value={scheduleInterval}
              onChange={(event) => setScheduleInterval(Number(event.target.value))}
              className="min-w-0 flex-1 bg-transparent text-right font-mono outline-none"
            />
            <span className="shrink-0 text-xs text-zinc-500">小时</span>
          </label>
        </div>
        {schedule?.lastRunAt ? <div className="mt-2 text-xs text-zinc-500">上次执行：{new Date(schedule.lastRunAt).toLocaleString()}</div> : null}
      </div>

      <div className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-zinc-100">清理策略</div>
            <div className="mt-1 text-xs text-zinc-500">备份至少保留 1 份；审计和聊天天数设置为 0 表示不清理。执行前会再次确认。</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePreviewCleanup}
              disabled={Boolean(busy)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {busy === "cleanup-preview" ? "预览中" : "预览清理"}
            </button>
            <button
              onClick={handleCleanup}
              disabled={Boolean(busy)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-bold text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {busy === "cleanup" ? "清理中" : "按策略清理"}
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField
            label="保留备份"
            suffix="份"
            value={cleanupBackupKeepCount}
            min={1}
            onChange={setCleanupBackupKeepCount}
          />
          <NumberField
            label="审计早于"
            suffix="天"
            value={cleanupAuditDays}
            min={0}
            onChange={setCleanupAuditDays}
          />
          <NumberField
            label="聊天早于"
            suffix="天"
            value={cleanupChatDays}
            min={0}
            onChange={setCleanupChatDays}
          />
        </div>
        {cleanupPreview ? (
          <div className="mt-3 grid gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-center text-xs sm:grid-cols-4">
            <MetricPill label="备份" value={cleanupPreview.backupsDeleted} />
            <MetricPill label="审计" value={cleanupPreview.auditLogsDeleted} />
            <MetricPill label="会话" value={cleanupPreview.chatSessionsDeleted} />
            <MetricPill label="消息" value={cleanupPreview.messagesDeleted} />
          </div>
        ) : null}
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-100">
            <LockKeyhole className="h-4 w-4 text-emerald-300" />
            加密备份导出
          </div>
          <div className="mb-3 text-xs leading-relaxed text-zinc-500">
            使用本机临时派生密钥加密 SQLite 备份，口令不会保存。适合放到网盘或跨设备迁移。
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={encryptionPassphrase}
              onChange={(event) => setEncryptionPassphrase(event.target.value)}
              placeholder="加密口令，至少 10 个字符"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#060a10] px-3 py-2 text-sm text-zinc-100 outline-none"
            />
            <button
              onClick={() => backups[0] && handleEncryptedExport(backups[0])}
              disabled={Boolean(busy) || !backups[0]}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {busy?.startsWith("encrypt-") ? "加密中" : "导出最新"}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-100">
            <Upload className="h-4 w-4 text-blue-300" />
            加密备份导入
          </div>
          <div className="mb-3 text-xs leading-relaxed text-zinc-500">
            导入后只会保存为一份可预览备份，不会立刻覆盖当前数据。恢复仍需要手动确认并重启。
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={importPassphrase}
              onChange={(event) => setImportPassphrase(event.target.value)}
              placeholder="导入口令"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#060a10] px-3 py-2 text-sm text-zinc-100 outline-none"
            />
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200">
              <Upload className="h-3.5 w-3.5" />
              {busy === "encrypted-import" ? "导入中" : "选择文件"}
              <input
                type="file"
                accept=".json,.lifeos-backup"
                className="hidden"
                disabled={Boolean(busy)}
                onChange={(event) => {
                  void handleEncryptedImport(event.target.files?.[0] || null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {preview ? <BackupPreviewCard preview={preview} /> : null}

      <BackupList backups={backups} busy={busy} onPreview={handlePreview} onRestore={handleRestore} />
    </section>
  );
}

function NumberField({
  label,
  suffix,
  value,
  min,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#060a10] px-3 py-2 text-sm text-zinc-300">
      <span className="shrink-0 text-xs text-zinc-500">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-w-0 flex-1 bg-transparent text-right font-mono outline-none"
      />
      <span className="shrink-0 text-xs text-zinc-500">{suffix}</span>
    </label>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-cyan-200/10 bg-black/10 px-3 py-2">
      <div className="text-cyan-100/60">{label}</div>
      <div className="mt-1 font-mono text-cyan-50">{value}</div>
    </div>
  );
}
