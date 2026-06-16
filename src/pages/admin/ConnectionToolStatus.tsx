import { Copy, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "../../i18n/I18nProvider";

export default function ConnectionToolStatus({
  title,
  status,
  rows,
  notes,
  onCopy,
  copied,
  extraCopy,
  installCopy,
  installUrl,
  actions,
}: {
  title: string;
  status: string;
  rows: Array<[string, string]>;
  notes: string[];
  onCopy?: () => void;
  copied: boolean;
  extraCopy?: { label: string; onCopy: () => void };
  installCopy?: { label: string; onCopy: () => void };
  installUrl?: string;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-bold text-zinc-100">{title}</div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-300">{status}</span>
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500">{label}</span>
            <span className="max-w-[70%] truncate text-right font-mono text-zinc-200">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
        {notes.map((note) => (
          <div key={note} className="text-xs leading-relaxed text-zinc-400">{note}</div>
        ))}
      </div>
      {onCopy ? (
        <button aria-label={t("connection.copyTitleAria", { title })} onClick={onCopy} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200">
          <Copy className="h-3.5 w-3.5" />
          {copied ? t("connection.copied") : t("connection.copy")}
        </button>
      ) : null}
      {extraCopy ? (
        <button aria-label={t("connection.copyEnvAria", { title })} onClick={extraCopy.onCopy} className="ml-2 mt-3 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200">
          <Copy className="h-3.5 w-3.5" />
          {extraCopy.label}
        </button>
      ) : null}
      {installCopy ? (
        <button aria-label={t("connection.copyInstallAria", { title })} onClick={installCopy.onCopy} className="ml-2 mt-3 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200">
          <Copy className="h-3.5 w-3.5" />
          {installCopy.label}
        </button>
      ) : null}
      {installUrl ? (
        <a href={installUrl} target="_blank" rel="noreferrer" className="ml-2 mt-3 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200">
          <ExternalLink className="h-3.5 w-3.5" />
          {t("connection.openInstallGuide")}
        </a>
      ) : null}
      {actions}
    </div>
  );
}
