import { AlertCircle, Plus, RefreshCw, Sparkles, Zap } from "lucide-react";
import type { KeyboardEvent } from "react";
import { TEMPLATES } from "../../../lib/templates";
import { PRESET_INSTRUCTIONS } from "./constants";
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

const quickPresets = [
  "加一个清除/清空记录的重置按钮",
  "将组件的底色换为尊贵的黑金渐变配色",
  "调整按钮比例：加粗加厚便于手机按压",
  "在空白处增加关于软件的使用教程提示",
];

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
                  JARVIS · 快捷口令智能设计微调 <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-bold">零代码微调</span>
                </h5>
                <p className="text-[10px] text-zinc-500 font-medium font-sans">输入任意设计和逻辑修改意图，JARVIS 极速为您改写底层代码并重新编译渲染</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2 px-1">
            {PRESET_INSTRUCTIONS.map((preset, idx) => (
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
                placeholder="描述您想做出的改变（如：'加一个清零数据的重置按钮'、'底色换成奢华黑金配色'、'把按钮加粗且放大些'）"
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
                  JARVIS 正在极速编译与渲染...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-650" />
                  让 JARVIS 修改
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-zinc-600 font-semibold mr-1">常用一键改写预设指令：</span>
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
              <span>改写失败: {refineError}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-2.5 bg-black/40 border-b border-white/[0.04] text-xs shrink-0">
          <div className="flex gap-1">
            <button
              onClick={() => onEditorActiveTabChange("code")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${editorActiveTab === "code" ? "bg-white/[0.05] text-white border border-white/[0.08]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              源代码编辑 ({((localCode.length || 0) / 1024).toFixed(1)} KB, {localCode.split("\n").length} 行)
            </button>
            <button
              onClick={() => onEditorActiveTabChange("guide")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${editorActiveTab === "guide" ? "bg-white/[0.05] text-white border border-white/[0.08]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              快速代码段与集成指南
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm("确定要格式化并清空所有的代码吗？")) {
                  onLocalCodeChange("");
                }
              }}
              className="px-2.5 py-1 text-[10px] rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-colors"
            >
              一键擦空
            </button>
            <button
              onClick={onPrettifyCode}
              className="px-2.5 py-1 text-[10px] rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/20 transition-colors"
            >
              智能排版 (Format)
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
                  placeholder="<!-- 在此输入或编辑网页代码，可引入 Tailwind & AlpineJS, HTML 结构等 -->"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 p-6 overflow-y-auto space-y-6 text-left">
              <div>
                <h4 className="font-bold text-zinc-300 text-xs uppercase tracking-wider mb-2.5">高性能高拟真应用示例 / Insert Boilerplates</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      onLocalCodeChange(TEMPLATES.todo);
                      alert("已成功加载待办事务清单 (Alpine.js) 持久化组件模板！");
                    }}
                    className="p-4 bg-indigo-500/5 hover:bg-indigo-500/10 border border-white/[0.05] hover:border-indigo-500 rounded-2xl transition-all text-left group"
                  >
                    <div className="font-bold text-xs text-zinc-200 flex items-center gap-1.5 mb-1">
                      <Plus className="w-3.5 h-3.5 border border-indigo-500/40 rounded bg-indigo-500/10 text-indigo-400" />
                      1. 事务轻卡片 (Alpine)
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">内置 LocalPersist 并通过样式化表格展示待办清单。</p>
                  </button>

                  <button
                    onClick={() => {
                      onLocalCodeChange(TEMPLATES.chart);
                      alert("已成功加载图表监控 (Chart.js Line) 延迟监控模板！");
                    }}
                    className="p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-white/[0.05] hover:border-emerald-500 rounded-2xl transition-all text-left group"
                  >
                    <div className="font-bold text-xs text-zinc-200 flex items-center gap-1.5 mb-1">
                      <Plus className="w-3.5 h-3.5 border border-emerald-500/40 rounded bg-emerald-500/10 text-emerald-400" />
                      2. 动态曲线制图 (ChartJS)
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">定期轮询并重绘画板 Canvas 延迟走势线，流畅度极高。</p>
                  </button>

                  <button
                    onClick={() => {
                      onLocalCodeChange(TEMPLATES.clock);
                      alert("已成功加载科学星空流星时钟 (Canvas Starfalling) 模板！");
                    }}
                    className="p-4 bg-purple-500/5 hover:bg-purple-500/10 border border-white/[0.05] hover:border-purple-500 rounded-2xl transition-all text-left group"
                  >
                    <div className="font-bold text-xs text-zinc-200 flex items-center gap-1.5 mb-1">
                      <Plus className="w-3.5 h-3.5 border border-purple-500/40 rounded bg-purple-500/10 text-purple-400" />
                      3. 流星悬浮时钟 (Canvas)
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">运用 HTML5 绘制粒子动画星雨时钟，具备 12H/24H 随行自适应切换。</p>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-zinc-300 text-xs uppercase tracking-wider mb-2">沙箱运行物理防护机制</h4>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2.5 text-zinc-400 leading-relaxed text-xs">
                  <p>• **为什么要采用 Standard Vanilla HTML/JS 混合？**</p>
                  <p className="pl-3.5 text-zinc-500">外部打包文件 (React / Vue) 通常含有极为繁冗的框架垫片，难以随卡片瞬时响应。JARVIS 完美推荐使用 `AlpineJS`。它仅占用极低的 CPU 周期，却能渲染出支持 LocalPersist 独立轻量缓存与多线程异步的大屏卡片。</p>
                  <p>• **如何把复杂的 React/Vue 项目移入？**</p>
                  <p className="pl-3.5 text-zinc-500">将您的本地 React/Vue 项目执行 `npm run build` 打包。把生成的 `dist/` 单页面内嵌 CSS 和 JS 合并输出，直接将这段 unified 静态 HTML 代码粘贴至编辑区，即可自动上架发布并激活测试运行！</p>
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
            独立物理卡片实时渲染器 / Previews
          </span>
          <button
            onClick={() => onRunningCodeChange(localCode)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
            title="测试编译并注入渲染器"
          >
            <Zap className="w-3 h-3" />
            渲染 Compile
          </button>
        </div>

        <div className="flex-1 bg-[#0a0a0c] relative flex flex-col min-h-0">
          <div className="flex-1 relative min-h-0">
            <StudioSandboxPreview
              code={runningCode}
              frameKey={runningCode.length}
              emptyTitle="暂无待编译代码"
              emptySubtitle="在左侧写完代码后，点击上角绿色 “渲染” 按钮即可预览输出。"
            />
          </div>
        </div>
      </div>
    </>
  );
}
