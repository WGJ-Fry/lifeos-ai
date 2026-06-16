import { Square, WandSparkles } from "lucide-react";
import type { NetworkDiagnostics } from "../../services/lifeosApi";
import { useI18n } from "../../i18n/I18nProvider";

export default function CloudflareTunnelActions({
  cloudflare,
  tunnelBusy,
  onStart,
  onStop,
}: {
  cloudflare: NetworkDiagnostics["cloudflare"];
  tunnelBusy: "start" | "stop" | null;
  onStart: () => void;
  onStop: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="mt-3 grid gap-2">
      <button
        onClick={onStart}
        disabled={tunnelBusy === "start"}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-50"
      >
        <WandSparkles className="h-3.5 w-3.5" />
        {tunnelBusy === "start" ? t("connection.cloudflareStarting") : t("connection.cloudflareStart")}
      </button>
      {cloudflare.managed.running ? (
        <button
          onClick={onStop}
          disabled={tunnelBusy === "stop"}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100 disabled:opacity-50"
        >
          <Square className="h-3.5 w-3.5" />
          {tunnelBusy === "stop" ? t("connection.cloudflareStopping") : t("connection.cloudflareStop")}
        </button>
      ) : null}
      {cloudflare.managed.url ? (
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/10 p-2 text-[11px] leading-relaxed text-emerald-100">
          {t("connection.cloudflareManagedUrl", { url: cloudflare.managed.url })}
        </div>
      ) : cloudflare.managed.lastError ? (
        <div className="rounded-xl border border-amber-400/15 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-100">
          {cloudflare.managed.lastError}
        </div>
      ) : null}
    </div>
  );
}
