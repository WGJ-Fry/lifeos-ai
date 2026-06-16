import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import type { NetworkDiagnostics } from "../../services/lifeosApi";
import { useI18n } from "../../i18n/I18nProvider";
import type { TranslationKey } from "../../i18n/translations";

const statusKeys: Record<NetworkDiagnostics["remoteReadiness"]["status"], TranslationKey> = {
  ready: "connection.readiness.status.ready",
  "needs-restart": "connection.readiness.status.needsRestart",
  temporary: "connection.readiness.status.temporary",
  "local-only": "connection.readiness.status.localOnly",
  "lan-only": "connection.readiness.status.lanOnly",
  blocked: "connection.readiness.status.blocked",
};

const itemKeys: Record<NetworkDiagnostics["remoteReadiness"]["actions"][number]["id"], TranslationKey> = {
  noRemoteEntry: "connection.readiness.item.noRemoteEntry",
  localOnly: "connection.readiness.item.localOnly",
  lanOnly: "connection.readiness.item.lanOnly",
  needsHttps: "connection.readiness.item.needsHttps",
  needsPublicOptIn: "connection.readiness.item.needsPublicOptIn",
  needsRestart: "connection.readiness.item.needsRestart",
  temporaryTunnel: "connection.readiness.item.temporaryTunnel",
  ready: "connection.readiness.item.ready",
};

const fallbackReadiness: NetworkDiagnostics["remoteReadiness"] = {
  status: "blocked",
  severity: "warning",
  candidateId: "",
  baseUrl: "",
  blockers: [],
  actions: [{ id: "noRemoteEntry" }],
};

export default function RemoteReadinessCard({ readiness }: { readiness?: NetworkDiagnostics["remoteReadiness"] }) {
  const { t } = useI18n();
  const current = readiness || fallbackReadiness;
  const Icon = current.severity === "ok" ? CheckCircle2 : current.severity === "warning" ? Clock3 : AlertTriangle;
  const tone = current.severity === "ok"
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
    : current.severity === "warning"
      ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
      : "border-red-400/20 bg-red-500/10 text-red-100";
  const items = current.blockers.length ? current.blockers : current.actions;

  return (
    <div className={`mt-4 rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-bold">{t(statusKeys[current.status])}</div>
          <div className="mt-1 break-all font-mono text-xs opacity-80">{current.baseUrl || t("connection.readiness.noAddress")}</div>
          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed opacity-90">
            {items.map((item, index) => (
              <li key={`${item.id}-${index}`}>{t(itemKeys[item.id], { value: item.detail || current.baseUrl })}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
