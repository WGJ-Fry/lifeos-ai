import { CheckCircle2, PlugZap } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { getNetworkDiagnostics, saveDesktopConnectionConfig, testConnectionUrl, type NetworkDiagnostics } from "../../services/lifeosApi";

export default function CustomRemoteEntryCard({
  defaultUrl,
  onSaved,
}: {
  defaultUrl: string;
  onSaved: (diagnostics: NetworkDiagnostics) => void;
}) {
  const { t } = useI18n();
  const [baseUrl, setBaseUrl] = useState(defaultUrl || "");
  const [label, setLabel] = useState(t("connection.customDefaultLabel"));
  const [busy, setBusy] = useState<"test" | "save" | null>(null);
  const [message, setMessage] = useState("");

  const normalizedUrl = baseUrl.trim().replace(/\/+$/, "");
  const isHttps = normalizedUrl.startsWith("https://");

  const handleTest = async () => {
    setBusy("test");
    setMessage("");
    try {
      const { result } = await testConnectionUrl(normalizedUrl);
      const passed = result.steps?.filter((step) => step.ok).length || 0;
      const total = result.steps?.length || 1;
      setMessage(result.ok ? t("connection.customTestOk", { latency: result.latencyMs, passed, total }) : t("connection.customTestFail", { message: result.error || `HTTP ${result.status}`, passed, total }));
    } catch (error: any) {
      setMessage(error.message || t("connection.testFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy("save");
    setMessage("");
    try {
      await saveDesktopConnectionConfig({ mode: "configured", label, baseUrl: normalizedUrl });
      const diagnostics = await getNetworkDiagnostics();
      onSaved(diagnostics);
      setMessage(t("connection.customSaved"));
    } catch (error: any) {
      setMessage(error.message || t("connection.saveFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-bold text-emerald-100">{t("connection.customTitle")}</div>
          <div className="mt-1 text-xs leading-relaxed text-emerald-100/70">{t("connection.customBody")}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isHttps ? "bg-emerald-400/15 text-emerald-100" : "bg-amber-400/15 text-amber-100"}`}>
          {isHttps ? t("connection.stableAddress") : t("connection.httpsRequired")}
        </span>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1.5fr_auto_auto]">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="rounded-xl border border-white/[0.08] bg-[#061016]/60 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-300/60"
          placeholder={t("connection.customLabelPlaceholder")}
        />
        <input
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          className="rounded-xl border border-white/[0.08] bg-[#061016]/60 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-emerald-300/60"
          placeholder="https://lifeos.example.com"
        />
        <button
          onClick={handleTest}
          disabled={!normalizedUrl || busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-[#061016]/40 px-3 py-2 text-xs font-bold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlugZap className="h-3.5 w-3.5" />
          {busy === "test" ? t("connection.testing") : t("connection.test")}
        </button>
        <button
          onClick={handleSave}
          disabled={!normalizedUrl || !isHttps || busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/15 px-3 py-2 text-xs font-bold text-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {busy === "save" ? t("connection.saving") : t("connection.customSave")}
        </button>
      </div>
      <div className="mt-2 text-[11px] leading-relaxed text-emerald-100/65">{t("connection.customHint")}</div>
      {message ? <div className="mt-3 rounded-xl border border-white/[0.08] bg-[#061016]/40 p-2 text-xs text-emerald-50">{message}</div> : null}
    </div>
  );
}
