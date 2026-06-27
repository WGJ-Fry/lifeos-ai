import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import type { ReleaseUpdateCheck } from "../../../services/lifeosApi";
import { useI18n } from "../../../i18n/I18nProvider";

function statusTone(status: ReleaseUpdateCheck["status"]) {
  if (status === "update-available") return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  if (status === "up-to-date") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  return "border-red-400/20 bg-red-500/10 text-red-100";
}

function StatusIcon({ status }: { status: ReleaseUpdateCheck["status"] }) {
  if (status === "up-to-date") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "update-available") return <RefreshCw className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
}

export default function ReleaseUpdateStatusCard({ updateCheck }: { updateCheck: ReleaseUpdateCheck }) {
  const { t } = useI18n();
  const latestTag = updateCheck.latest?.tag || "-";
  const recommendationKeys = updateCheck.status === "update-available"
    ? ["diagnostics.releaseUpdate.rec.download", "diagnostics.releaseUpdate.rec.sha", "diagnostics.releaseUpdate.rec.backup", "diagnostics.releaseUpdate.rec.manual"]
    : updateCheck.status === "up-to-date"
      ? ["diagnostics.releaseUpdate.rec.current", "diagnostics.releaseUpdate.rec.manual"]
      : ["diagnostics.releaseUpdate.rec.openGithub", "diagnostics.releaseUpdate.rec.officialOnly"];
  const title = updateCheck.status === "update-available"
    ? t("diagnostics.releaseUpdate.availableTitle", { tag: latestTag })
    : updateCheck.status === "up-to-date"
      ? t("diagnostics.releaseUpdate.currentTitle")
      : t("diagnostics.releaseUpdate.unavailableTitle");
  const body = updateCheck.status === "update-available"
    ? t("diagnostics.releaseUpdate.availableBody", { current: updateCheck.current.tag, latest: latestTag })
    : updateCheck.status === "up-to-date"
      ? t("diagnostics.releaseUpdate.currentBody", { current: updateCheck.current.tag })
      : t("diagnostics.releaseUpdate.unavailableBody", { reason: updateCheck.reason });

  return (
    <div className={`mt-4 rounded-2xl border p-4 text-xs leading-relaxed ${statusTone(updateCheck.status)}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/15 bg-black/10">
          <StatusIcon status={updateCheck.status} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold">{title}</div>
          <div className="mt-1 opacity-85">{body}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-current/15 bg-black/10 px-3 py-2">
              <div className="opacity-70">{t("diagnostics.releaseUpdate.current")}</div>
              <div className="mt-0.5 truncate font-bold">{updateCheck.current.tag}</div>
            </div>
            <div className="rounded-xl border border-current/15 bg-black/10 px-3 py-2">
              <div className="opacity-70">{t("diagnostics.releaseUpdate.latest")}</div>
              <div className="mt-0.5 truncate font-bold">{latestTag}</div>
            </div>
            <div className="rounded-xl border border-current/15 bg-black/10 px-3 py-2">
              <div className="opacity-70">{t("diagnostics.releaseUpdate.checksum")}</div>
              <div className="mt-0.5 truncate font-bold">{updateCheck.latest?.checksumAsset?.name || "-"}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1 border-t border-current/15 pt-3 opacity-90">
            {recommendationKeys.map((key) => <div key={key}>{t(key as any, { tag: latestTag })}</div>)}
          </div>
          {updateCheck.latest?.url ? (
            <a
              href={updateCheck.latest.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-current/20 bg-black/10 px-2.5 py-1.5 font-bold"
            >
              {t("diagnostics.releaseUpdate.openRelease")}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
