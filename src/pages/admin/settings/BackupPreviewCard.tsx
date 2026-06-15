import type { BackupPreview } from "../../../services/lifeosApi";

export function BackupPreviewCard({ preview }: { preview: BackupPreview }) {
  return (
    <div className="mb-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-bold">备份预览：{preview.backup.file}</div>
          <div className="mt-1 text-xs text-blue-100/65">
            大小：{(preview.backup.size / 1024).toFixed(1)} KB · 创建时间：{preview.backup.createdAt ? new Date(preview.backup.createdAt).toLocaleString() : "未知"}
          </div>
        </div>
        <div className="rounded-full border border-blue-200/15 bg-blue-200/10 px-3 py-1 text-xs font-bold text-blue-50">
          {preview.migrations.length} 个 migration
        </div>
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-3">
        {Object.entries(preview.tables).map(([table, count]) => (
          <div key={table} className="rounded-xl border border-blue-200/10 bg-black/10 px-3 py-2">
            <div className="text-blue-100/60">{table}</div>
            <div className="mt-1 font-mono text-blue-50">{count ?? "-"}</div>
          </div>
        ))}
      </div>
      {preview.sensitiveData ? (
        <div className={`mt-3 rounded-xl border p-3 text-xs leading-relaxed ${preview.sensitiveData.ordinaryBackupExcludesSecrets ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-50" : "border-red-200/20 bg-red-300/10 text-red-50"}`}>
          <div className="font-bold">{preview.sensitiveData.ordinaryBackupExcludesSecrets ? "普通备份已排除敏感密钥" : "备份仍包含敏感数据"}</div>
          <div className="mt-1">
            AI Key 记录：{preview.sensitiveData.appSecretsRows}，敏感客户端状态：{preview.sensitiveData.sensitiveClientStateRows}。
            {preview.sensitiveData.ordinaryBackupExcludesSecrets ? "恢复后需要在设置里重新配置 AI Key。" : "请改用加密备份或重新创建安全备份。"}
          </div>
        </div>
      ) : null}
      {preview.warnings.length ? (
        <div className="mt-3 rounded-xl border border-amber-200/20 bg-amber-300/10 p-3 text-xs leading-relaxed text-amber-50">
          <div className="mb-1 font-bold">恢复风险说明</div>
          <ul className="space-y-1">
            {preview.warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
