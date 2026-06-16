import { useI18n } from "../../../i18n/I18nProvider";
import type { BackupPreview } from "../../../services/lifeosApi";

export function BackupPreviewCard({ preview }: { preview: BackupPreview }) {
  const { t } = useI18n();

  return (
    <div className="mb-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-bold">{t("backupPreview.title", { file: preview.backup.file })}</div>
          <div className="mt-1 text-xs text-blue-100/65">
            {t("backupPreview.meta", { size: (preview.backup.size / 1024).toFixed(1), time: preview.backup.createdAt ? new Date(preview.backup.createdAt).toLocaleString() : t("common.unknown") })}
          </div>
        </div>
        <div className="rounded-full border border-blue-200/15 bg-blue-200/10 px-3 py-1 text-xs font-bold text-blue-50">
          {t("backupPreview.migrations", { count: String(preview.migrations.length) })}
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
          <div className="font-bold">{preview.sensitiveData.ordinaryBackupExcludesSecrets ? t("backupPreview.secretsExcluded") : t("backupPreview.secretsIncluded")}</div>
          <div className="mt-1">
            {t("backupPreview.secretRows", { appSecrets: String(preview.sensitiveData.appSecretsRows), clientState: String(preview.sensitiveData.sensitiveClientStateRows) })}
            {preview.sensitiveData.ordinaryBackupExcludesSecrets ? t("backupPreview.reconfigureKeys") : t("backupPreview.useEncrypted")}
          </div>
        </div>
      ) : null}
      {preview.warnings.length ? (
        <div className="mt-3 rounded-xl border border-amber-200/20 bg-amber-300/10 p-3 text-xs leading-relaxed text-amber-50">
          <div className="mb-1 font-bold">{t("backupPreview.risks")}</div>
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
