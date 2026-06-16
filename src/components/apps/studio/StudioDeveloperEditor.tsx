import { AlertCircle, Plus, RefreshCw, Sparkles, Zap } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useI18n } from "../../../i18n/I18nProvider";
import { TEMPLATES } from "../../../lib/templates";
import StudioSandboxPreview from "./StudioSandboxPreview";

type StudioDeveloperEditorProps = {
  editorActiveTab: "code" | "guide";
  localCode: string;
  runningCode: string;
  refineInstruction: string;
  isRefining: boolean;
  refineError: string | null;
  onEditorActiveTabChange: (tab: "code" | "guide") => void;
  onLocalCodeChange: (code: string) => void;
  onRunningCodeChange: (code: string) => void;
  onRefineInstructionChange: (instruction: string) => void;
  onRefine: () => void;
  onPrettifyCode: () => void;
  onTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export default function StudioDeveloperEditor({
  editorActiveTab,
  localCode,
  runningCode,
  refineInstruction,
  isRefining,
  refineError,
  onEditorActiveTabChange,
  onLocalCodeChange,
  onRunningCodeChange,
  onRefineInstructionChange,
  onRefine,
  onPrettifyCode,
  onTextareaKeyDown,
}: StudioDeveloperEditorProps) {
  const { t } = useI18n();
  const presetInstructions = [
    { label: t("studio.dev.presetResetLabel"), prompt: t("studio.dev.presetResetPrompt") },
    { label: t("studio.dev.presetThemeLabel"), prompt: t("studio.dev.presetThemePrompt") },
    { label: t("studio.dev.presetPersistLabel"), prompt: t("studio.dev.presetPersistPrompt") },
    { label: t("studio.dev.presetMotionLabel"), prompt: t("studio.dev.presetMotionPrompt") },
  ];
  const quickPresets = [
    t("studio.dev.quickReset"),
    t("studio.dev.quickTheme"),
    t("studio.dev.quickButton"),
    t("studio.dev.quickGuide"),
  ];

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 bg-[#070709] border-r border-white/[0.06]">
        <div className="bg-[#0b0b0e] border-b border-white/[0.08] p-5 text-left space-y-3 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                <Sparkles className="w-4 h-4 animate-pulse animate-duration-1000" />
              </div>
              <div>
                <h5 className="text-zinc-100 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  {t("studio.dev.title")} <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-bold">{t("studio.dev.noCodeBadge")}</span>
                </h5>
                <p className="text-[10px] text-zinc-500 font-medium font-sans">{t("studio.dev.subtitle")}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2 px-1">
            {presetInstructions.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onRefineInstructionChange(preset.prompt)}
                className="text-[9px] px-2.5 py-1 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 border border-[#4f46e5]/10 hover:border-[#4f46e5]/30 text-indigo-400 font-bold transition-all transform active:scale-95"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={refineInstruction}
                onChange={(event) => onRefineInstructionChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !isRefining) {
                    onRefine();
                  }
                }}
                placeholder={t("studio.dev.placeholder")}
                disabled={isRefining}
                className="w-full bg-[#111113] hover:border-white/10 focus:border-indigo-500 border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-zinc-200 outline-none placeholder-zinc-600 transition-all focus:shadow-[0_0_15px_rgba(99,102,241,0.1)] disabled:opacity-50"
              />
            </div>
            <button
              onClick={onRefine}
              disabled={isRefining || !refineInstruction.trim()}
              className="bg-zinc-100 hover:bg-white text-black disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-lg active:scale-95 disabled:pointer-events-none"
            >
              {isRefining ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {t("studio.dev.refining")}
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-650" />
                  {t("studio.dev.refine")}
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-zinc-600 font-semibold mr-1">{t("studio.dev.quickPresets")}</span>
            {quickPresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => onRefineInstructionChange(preset)}
                disabled={isRefining}
                className="text-[10px] bg-white/[0.02] hover:bg-indigo-500/10 border border-white/[0.04] hover:border-indigo-500/30 px-2 py-1 rounded text-zinc-400 hover:text-indigo-400 transition-all font-medium disabled:opacity-50"
              >
                + {preset.slice(0, 14)}...
              </button>
            ))}
          </div>

          {refineError && (
            <div className="text-[10px] text-red-400 font-bold bg-red-500/5 border border-red-500/10 p-2.5 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{t("studio.dev.refineFailed", { message: refineError })}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-2.5 bg-black/40 border-b border-white/[0.04] text-xs shrink-0">
          <div className="flex gap-1">
            <button
              onClick={() => onEditorActiveTabChange("code")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${editorActiveTab === "code" ? "bg-white/[0.05] text-white border border-white/[0.08]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {t("studio.dev.sourceTab", { size: ((localCode.length || 0) / 1024).toFixed(1), lines: String(localCode.split("\n").length) })}
            </button>
            <button
              onClick={() => onEditorActiveTabChange("guide")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${editorActiveTab === "guide" ? "bg-white/[0.05] text-white border border-white/[0.08]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {t("studio.dev.guideTab")}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(t("studio.dev.confirmClearCode"))) {
                  onLocalCodeChange("");
                }
              }}
              className="px-2.5 py-1 text-[10px] rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-colors"
            >
              {t("studio.dev.clearCode")}
            </button>
            <button
              onClick={onPrettifyCode}
              className="px-2.5 py-1 text-[10px] rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/20 transition-colors"
            >
              {t("studio.dev.format")}
            </button>
          </div>
        </div>

        <div className="flex-1 flex text-sm overflow-hidden relative">
          {editorActiveTab === "code" ? (
            <>
              <div className="w-12 bg-black/20 border-r border-white/[0.02] flex flex-col items-center py-5 text-zinc-700 font-mono text-[10px] select-none overflow-hidden shrink-0">
                {Array.from({ length: 120 }).map((_, i) => <div key={i} className="mb-[10px] h-4 leading-none">{i + 1}</div>)}
              </div>
              <div className="flex-1 relative">
                <textarea
                  className="absolute inset-0 w-full h-full bg-transparent text-indigo-200/90 font-mono p-5 outline-none resize-none leading-relaxed overflow-y-auto text-xs"
                  value={localCode}
                  onChange={(event) => onLocalCodeChange(event.target.value)}
                  onKeyDown={onTextareaKeyDown}
                  spellCheck={false}
                  placeholder={t("studio.dev.codePlaceholder")}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 p-6 overflow-y-auto space-y-6 text-left">
              <div>
                <h4 className="font-bold text-zinc-300 text-xs uppercase tracking-wider mb-2.5">{t("studio.dev.boilerplates")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      onLocalCodeChange(TEMPLATES.todo);
                      alert(t("studio.dev.todoLoaded"));
                    }}
                    className="p-4 bg-indigo-500/5 hover:bg-indigo-500/10 border border-white/[0.05] hover:border-indigo-500 rounded-2xl transition-all text-left group"
                  >
                    <div className="font-bold text-xs text-zinc-200 flex items-center gap-1.5 mb-1">
                      <Plus className="w-3.5 h-3.5 border border-indigo-500/40 rounded bg-indigo-500/10 text-indigo-400" />
                      {t("studio.dev.todoTitle")}
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">{t("studio.dev.todoBody")}</p>
                  </button>

                  <button
                    onClick={() => {
                      onLocalCodeChange(TEMPLATES.chart);
                      alert(t("studio.dev.chartLoaded"));
                    }}
                    className="p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-white/[0.05] hover:border-emerald-500 rounded-2xl transition-all text-left group"
                  >
                    <div className="font-bold text-xs text-zinc-200 flex items-center gap-1.5 mb-1">
                      <Plus className="w-3.5 h-3.5 border border-emerald-500/40 rounded bg-emerald-500/10 text-emerald-400" />
                      {t("studio.dev.chartTitle")}
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">{t("studio.dev.chartBody")}</p>
                  </button>

                  <button
                    onClick={() => {
                      onLocalCodeChange(TEMPLATES.clock);
                      alert(t("studio.dev.clockLoaded"));
                    }}
                    className="p-4 bg-purple-500/5 hover:bg-purple-500/10 border border-white/[0.05] hover:border-purple-500 rounded-2xl transition-all text-left group"
                  >
                    <div className="font-bold text-xs text-zinc-200 flex items-center gap-1.5 mb-1">
                      <Plus className="w-3.5 h-3.5 border border-purple-500/40 rounded bg-purple-500/10 text-purple-400" />
                      {t("studio.dev.clockTitle")}
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">{t("studio.dev.clockBody")}</p>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-zinc-300 text-xs uppercase tracking-wider mb-2">{t("studio.dev.sandboxTitle")}</h4>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2.5 text-zinc-400 leading-relaxed text-xs">
                  <p>{t("studio.dev.sandboxQuestionVanilla")}</p>
                  <p className="pl-3.5 text-zinc-500">{t("studio.dev.sandboxAnswerVanilla")}</p>
                  <p>{t("studio.dev.sandboxQuestionFramework")}</p>
                  <p className="pl-3.5 text-zinc-500">{t("studio.dev.sandboxAnswerFramework")}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-[320px] lg:w-[420px] hidden xl:flex flex-col bg-[#050505] relative overflow-hidden text-zinc-300">
        <div className="px-5 py-3 border-b border-white/[0.06] bg-black/40 flex items-center justify-between text-xs font-mono shrink-0">
          <span className="text-zinc-400 font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            {t("studio.dev.previewTitle")}
          </span>
          <button
            onClick={() => onRunningCodeChange(localCode)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
            title={t("studio.dev.compileTitle")}
          >
            <Zap className="w-3 h-3" />
            {t("studio.dev.compile")}
          </button>
        </div>

        <div className="flex-1 bg-[#0a0a0c] relative flex flex-col min-h-0">
          <div className="flex-1 relative min-h-0">
            <StudioSandboxPreview
              code={runningCode}
              frameKey={runningCode.length}
              emptyTitle={t("studio.dev.emptyTitle")}
              emptySubtitle={t("studio.dev.emptySubtitle")}
            />
          </div>
        </div>
      </div>
    </>
  );
}
