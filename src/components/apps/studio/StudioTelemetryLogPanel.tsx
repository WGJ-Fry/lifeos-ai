import { useI18n } from "../../../i18n/I18nProvider";

export type StudioTelemetryLog = {
  time: string;
  text: string;
  type: "log" | "error" | "info";
};

export default function StudioTelemetryLogPanel({
  compact = false,
  logs,
  showConsole,
  title,
  onReset,
  onToggle,
}: {
  compact?: boolean;
  logs: StudioTelemetryLog[];
  showConsole: boolean;
  title: string;
  onReset: () => void;
  onToggle: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className={`${compact ? "border-t" : "mt-2 rounded-xl border"} flex shrink-0 flex-col overflow-hidden border-white/[0.06] bg-[#0c0c0f] text-zinc-300`}>
      <div
        onClick={onToggle}
        className={`${compact ? "px-4 py-2" : "px-4 py-2.5"} flex cursor-pointer select-none items-center justify-between border-b border-white/[0.04] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:bg-white/[0.04]`}
      >
        <div className="flex items-center gap-2">
          <span className={`${compact ? "bg-emerald-400" : "bg-indigo-400"} h-1.5 w-1.5 animate-pulse rounded-full`} />
          <span className={`font-mono tracking-wide text-zinc-400 ${compact ? "max-w-[140px] truncate text-[9px]" : ""}`}>{title}</span>
        </div>
        <div className={compact ? "flex items-center gap-1.5" : "flex items-center gap-3"}>
          {logs.length > 2 ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onReset();
              }}
              className={`${compact ? "text-[8px]" : "text-[9px]"} rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono font-bold transition-all hover:bg-white/[0.06] hover:text-zinc-200`}
            >
              {compact ? "RESET" : "RESET LOGS"}
            </button>
          ) : null}
          <span className={compact ? "text-[9px]" : ""}>{showConsole ? (compact ? "▼" : t("studio.telemetry.collapse")) : compact ? "▲" : t("studio.telemetry.expand")}</span>
        </div>
      </div>

      {showConsole ? (
        <div className={`${compact ? "max-h-[125px] p-2.5 text-[9px]" : "max-h-[140px] p-3.5 text-[10px]"} space-y-1.5 overflow-y-auto bg-[#08080a] text-left font-mono scrollbar-thin`}>
          {logs.slice().reverse().map((log, index) => (
            <div key={index} className={`${compact ? "gap-1.5 pb-1" : "gap-2.5 pb-1.5"} flex items-start border-b border-white/[0.01] last:border-0 hover:bg-white/[0.02]`}>
              <span className="shrink-0 select-none font-mono font-medium text-zinc-650">[{log.time}]</span>
              {log.type === "error" ? (
                <span className="font-sans font-medium text-red-400">X {log.text}</span>
              ) : log.type === "info" ? (
                <span className="font-sans font-semibold text-indigo-400">i {log.text}</span>
              ) : (
                <span className="font-mono font-medium text-[#98c379]">* {log.text}</span>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
