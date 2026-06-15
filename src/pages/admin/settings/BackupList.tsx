import { CalendarClock, DatabaseBackup, Download, RotateCcw } from "lucide-react";
import { backupDownloadUrl, listBackups } from "../../../services/lifeosApi";

type BackupItem = Awaited<ReturnType<typeof listBackups>>["backups"][number];

export function BackupList({
  backups,
  busy,
  onPreview,
  onRestore,
}: {
  backups: BackupItem[];
  busy: string | null;
  onPreview: (backup: BackupItem) => void;
  onRestore: (backup: BackupItem) => void;
}) {
  if (backups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-center text-sm text-zinc-500">
        还没有备份。创建一次备份后，这里会显示可下载和可恢复的 SQLite 快照。
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
      {backups.slice(0, 8).map((backup) => (
        <div key={backup.file} className="flex flex-col gap-3 border-b border-white/[0.06] bg-white/[0.02] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="truncate font-mono text-xs text-zinc-200">{backup.file}</div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                {new Date(backup.createdAt).toLocaleString()}
              </span>
              <span>{(backup.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={backupDownloadUrl(backup.file)} className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200">
              <Download className="h-3.5 w-3.5" />
              下载
            </a>
            <button
              onClick={() => onPreview(backup)}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DatabaseBackup className="h-3.5 w-3.5" />
              {busy === `preview-${backup.file}` ? "读取中" : "预览"}
            </button>
            <button
              onClick={() => onRestore(backup)}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {busy === backup.file ? "安排中" : "恢复"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
