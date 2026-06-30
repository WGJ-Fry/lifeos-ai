import { ClipboardCheck } from "lucide-react";
import type { NetworkDiagnostics } from "../../services/lifeosApi";
import { useI18n } from "../../i18n/I18nProvider";

const itemKey = {
  "tailscale-https-serve": "connection.acceptance.item.tailscale",
  "cloudflare-named-tunnel": "connection.acceptance.item.cloudflare",
  "remote-smoke": "connection.acceptance.item.remoteSmoke",
  "restart-restore": "connection.acceptance.item.restartRestore",
  "cellular-mobile-chat": "connection.acceptance.item.cellular",
  "network-switch": "connection.acceptance.item.networkSwitch",
  "stale-qr-repair": "connection.acceptance.item.staleQrRepair",
  "network-interruption": "connection.acceptance.item.networkInterruption",
  "diagnostic-export": "connection.acceptance.item.diagnosticExport",
  "ci-remote-mock": "connection.acceptance.item.ci",
} as const;

export default function RemoteAcceptanceEvidencePackCard({
  evidencePack,
}: {
  evidencePack?: NetworkDiagnostics["remoteAcceptanceEvidencePack"] | null;
}) {
  const { t } = useI18n();
  if (!evidencePack) return null;
  const tone = evidencePack.ready
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
    : "border-amber-400/20 bg-amber-500/10 text-amber-100";
  const missing = [...evidencePack.missingRealWorldIds, ...evidencePack.expiredRealWorldIds];
  return (
    <section className={`mt-4 rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{t("connection.evidencePack.title")}</div>
          <p className="mt-1 text-xs leading-relaxed opacity-80">{t("connection.evidencePack.body")}</p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <Metric label={t("connection.evidencePack.realWorld")} value={`${evidencePack.realWorldPassed}/${evidencePack.realWorldTotal}`} />
            <Metric label={t("connection.evidencePack.automated")} value={evidencePack.automatedReady ? t("connection.evidencePack.ready") : t("connection.evidencePack.notReady")} />
            <Metric label={t("connection.evidencePack.longTermEntry")} value={evidencePack.longTermEntryReady ? t("connection.evidencePack.ready") : t("connection.evidencePack.notReady")} />
          </div>
          <div className="mt-3 rounded-xl border border-current/15 bg-black/10 p-3 text-xs leading-relaxed">
            <div className="font-bold">{t("connection.evidencePack.recommendedAction")}</div>
            <div className="mt-1 opacity-85">{t(`connection.evidencePack.action.${evidencePack.recommendedAction}` as any)}</div>
            {evidencePack.nextReviewAt ? (
              <div className="mt-2 opacity-75">{t("connection.evidencePack.nextReview", { time: new Date(evidencePack.nextReviewAt).toLocaleString() })}</div>
            ) : null}
          </div>
          {evidencePack.priorityTasks?.length ? (
            <div className="mt-3 rounded-xl border border-current/15 bg-black/10 p-3 text-xs">
              <div className="font-bold">{t("connection.evidencePack.priorityTasks")}</div>
              <div className="mt-3 grid gap-2">
                {evidencePack.priorityTasks.slice(0, 5).map((task) => (
                  <div key={`${task.id}-${task.status}`} className="rounded-xl border border-current/10 bg-black/10 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-bold">{t(task.titleKey as any)}</div>
                        <div className="mt-1 opacity-75">{t(task.bodyKey as any)}</div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${taskPriorityTone(task.priority)}`}>
                          {t(`connection.evidencePack.priority.${task.priority}` as any)}
                        </span>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${taskStatusTone(task.status)}`}>
                          {t(`connection.evidencePack.taskStatus.${task.status}` as any)}
                        </span>
                      </div>
                    </div>
                    {task.command ? <code className="mt-2 block break-all rounded-lg bg-black/20 px-2 py-1.5 text-[10px] opacity-80">{task.command}</code> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {missing.length ? (
            <div className="mt-3 rounded-xl border border-current/15 bg-black/10 p-3 text-xs">
              <div className="font-bold">{t("connection.evidencePack.gaps")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(new Set(missing)).map((id) => (
                  <span key={id} className="rounded-full border border-current/15 bg-black/10 px-2 py-1">
                    {t(itemKey[id] as any)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {evidencePack.scenarioMatrix?.length ? (
            <div className="mt-3 rounded-xl border border-current/15 bg-black/10 p-3 text-xs">
              <div className="font-bold">{t("connection.evidencePack.scenarioMatrix")}</div>
              <div className="mt-3 grid gap-2">
                {evidencePack.scenarioMatrix.map((scenario) => (
                  <div key={scenario.id} className="rounded-xl border border-current/10 bg-black/10 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-bold">{t(scenario.titleKey as any)}</div>
                        <div className="mt-1 opacity-75">{t(scenario.proofKey as any)}</div>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${scenarioStatusTone(scenario.status)}`}>
                        {t(`connection.evidencePack.scenarioStatus.${scenario.status}` as any)}
                      </span>
                    </div>
                    <div className="mt-2 opacity-80">{scenario.evidence}</div>
                    <div className="mt-2 flex flex-wrap gap-2 opacity-75">
                      {scenario.acceptedAt ? (
                        <span>{t("connection.evidencePack.acceptedAge", { days: String(scenario.ageDays ?? 0) })}</span>
                      ) : null}
                      {scenario.expiresAt ? (
                        <span>{t("connection.evidencePack.expiresAt", { time: new Date(scenario.expiresAt).toLocaleString() })}</span>
                      ) : null}
                      <span>{t(`connection.evidencePack.scenarioAction.${scenario.nextAction}` as any)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function scenarioStatusTone(status: "passed" | "missing" | "expired") {
  if (status === "passed") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  if (status === "expired") return "border-rose-300/30 bg-rose-400/10 text-rose-100";
  return "border-amber-300/30 bg-amber-400/10 text-amber-100";
}

function taskPriorityTone(priority: "critical" | "high" | "normal") {
  if (priority === "critical") return "border-rose-300/30 bg-rose-400/10 text-rose-100";
  if (priority === "high") return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  return "border-sky-300/30 bg-sky-400/10 text-sky-100";
}

function taskStatusTone(status: "blocked" | "missing" | "expired") {
  if (status === "blocked") return "border-rose-300/30 bg-rose-400/10 text-rose-100";
  if (status === "expired") return "border-purple-300/30 bg-purple-400/10 text-purple-100";
  return "border-amber-300/30 bg-amber-400/10 text-amber-100";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-current/15 bg-black/10 px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-base font-black">{value}</div>
    </div>
  );
}
