import type { MobileConnectivityResult } from "../../services/pwaCapabilities";
import { useI18n } from "../../i18n/I18nProvider";

export default function MobileConnectivityCard({ result }: { result: MobileConnectivityResult }) {
  const { t } = useI18n();
  const passed = result.steps.filter((step) => step.ok).length;
  return (
    <div className={`mt-4 rounded-2xl border p-3 text-sm ${result.ok ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-red-400/20 bg-red-500/10 text-red-100"}`}>
      <div className="font-bold">
        {result.ok
          ? t("mobileDevice.connectivityOk", { passed, total: result.steps.length, latency: result.latencyMs })
          : t("mobileDevice.connectivityFail", { passed, total: result.steps.length, message: result.error || "-" })}
      </div>
      <div className="mt-3 space-y-2">
        {result.steps.map((step) => (
          <div key={step.id} className="rounded-xl border border-white/[0.08] bg-black/10 p-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">{t(step.id === "health" ? "mobileDevice.connectivityHealth" : "mobileDevice.connectivityRealtime")}</span>
              <span className={step.ok ? "text-emerald-200" : "text-red-200"}>{step.ok ? t("mobileDevice.pass") : t("mobileDevice.fail")}</span>
            </div>
            <div className="mt-1 break-all font-mono text-[11px] opacity-70">{step.url}</div>
            <div className="mt-1 text-xs opacity-80">{step.ok ? `${step.latencyMs}ms` : step.error}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
