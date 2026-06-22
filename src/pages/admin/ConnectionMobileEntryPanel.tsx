import { PlugZap } from "lucide-react";
import type { NetworkDiagnostics } from "../../services/lifeosApi";
import { useI18n } from "../../i18n/I18nProvider";

export default function ConnectionMobileEntryPanel({
  mobileChatUrl,
  recommendedCandidate,
  testing,
  onTest,
}: {
  mobileChatUrl: string;
  recommendedCandidate: NetworkDiagnostics["connectionCandidates"][number] | null;
  testing: boolean;
  onTest: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs text-zinc-400 md:grid-cols-[1fr_1fr_auto]">
      <div>
        <div className="mb-1 font-bold text-zinc-200">{t("connection.mobileEntry")}</div>
        <div aria-label={t("connection.mobileEntryAria")} className="font-mono text-cyan-200">{mobileChatUrl || t("connection.noPhoneReachableShort")}</div>
        <div className="mt-1 leading-relaxed text-zinc-500">{recommendedCandidate ? t("connection.pairingQrHint") : t("connection.noPhoneReachableAction")}</div>
      </div>
      <div>
        <div className="mb-1 font-bold text-zinc-200">{t("connection.mobileChatEntry")}</div>
        <div aria-label={t("connection.mobileChatEntryAria")} className="font-mono text-cyan-200">{mobileChatUrl || t("connection.noPhoneReachableShort")}</div>
      </div>
      <div className="flex items-end">
        <button onClick={onTest} disabled={testing || !recommendedCandidate} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">
          <PlugZap className="h-3.5 w-3.5" />
          {testing ? t("connection.testing") : t("connection.testRecommended")}
        </button>
      </div>
    </div>
  );
}
