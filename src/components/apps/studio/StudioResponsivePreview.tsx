import { Sparkles } from "lucide-react";
import StudioSandboxPreview from "./StudioSandboxPreview";
import StudioTelemetryLogPanel, { StudioTelemetryLog } from "./StudioTelemetryLogPanel";

export type StudioPreviewDevice = "mobile" | "tablet" | "responsive";

type StudioResponsivePreviewProps = {
  runningCode: string;
  refineInstruction: string;
  isRefining: boolean;
  previewDevice: StudioPreviewDevice;
  isLandscape: boolean;
  simulatorLogs: StudioTelemetryLog[];
  showConsole: boolean;
  onPreviewDeviceChange: (device: StudioPreviewDevice) => void;
  onLandscapeChange: (isLandscape: boolean) => void;
  onAppendSimulatorLog: (log: StudioTelemetryLog) => void;
  onResetLogs: () => void;
  onToggleConsole: () => void;
};

const devices: Array<{ id: StudioPreviewDevice; label: string }> = [
  { id: "mobile", label: "手机视口" },
  { id: "tablet", label: "平板视口" },
  { id: "responsive", label: "自适应" },
];

export default function StudioResponsivePreview({
  runningCode,
  refineInstruction,
  isRefining,
  previewDevice,
  isLandscape,
  simulatorLogs,
  showConsole,
  onPreviewDeviceChange,
  onLandscapeChange,
  onAppendSimulatorLog,
  onResetLogs,
  onToggleConsole,
}: StudioResponsivePreviewProps) {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 min-w-0 overflow-hidden relative">
      <div className="px-5 py-3 border border-white/[0.06] bg-[#09090b] rounded-t-2xl flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5 justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/30 border border-red-500/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/30 border border-yellow-500/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/30 border border-green-500/40" />
          </span>
          <span className="text-zinc-300 font-bold ml-1 flex items-center gap-2">
            JARVIS 沙盒高级调试终端 <span className="text-zinc-650 font-normal">|</span>
            <span className="text-zinc-400 font-medium hidden sm:inline">端侧事件完全互锁，可自由交互</span>
          </span>
        </div>

        <div className="flex items-center gap-2 bg-[#111113] border border-white/[0.05] p-1 rounded-xl shrink-0">
          <div className="flex bg-black/45 p-0.5 rounded-lg">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => {
                  onPreviewDeviceChange(device.id);
                  localStorage.setItem("omnipreview_device", device.id);
                }}
                className={`px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-all ${
                  previewDevice === device.id
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    : "text-zinc-400 hover:text-zinc-255 border border-transparent"
                }`}
              >
                {device.label}
              </button>
            ))}
          </div>

          {previewDevice !== "responsive" && (
            <button
              onClick={() => {
                const nextLandscape = !isLandscape;
                onLandscapeChange(nextLandscape);
                onAppendSimulatorLog({
                  time: "COMPILER",
                  text: `调整虚拟窗口比例: [${nextLandscape ? "横向拓扑 (Landscape)" : "纵向适配 (Portrait)"}]`,
                  type: "log",
                });
              }}
              title="一键转换容器高宽方向"
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all border ${
                isLandscape
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-[#161619] text-zinc-400 border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              {isLandscape ? "横屏" : "竖屏"}
            </button>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            PREVIEW RUNNING
          </span>
        </div>
      </div>

      <div className="flex-1 bg-[#050507] border-x border-b border-white/[0.06] rounded-b-2xl p-4 sm:p-6 overflow-hidden flex flex-col min-h-0 relative">
        <div className="flex-1 overflow-y-auto flex justify-center items-center pb-4 min-h-0">
          <div
            style={{
              width: previewDevice === "responsive" ? "100%" : previewDevice === "tablet" ? (isLandscape ? "100%" : "768px") : (isLandscape ? "720px" : "390px"),
              height: previewDevice === "responsive" ? "100%" : previewDevice === "tablet" ? (isLandscape ? "440px" : "100%") : (isLandscape ? "390px" : "100%"),
              maxWidth: "100%",
              maxHeight: "100%",
            }}
            className={`min-h-[300px] transition-all duration-300 ease-out bg-[#0a0a0a] border border-white/[0.08] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative flex flex-col ${
              previewDevice !== "responsive"
                ? "rounded-[36px] overflow-hidden p-3.5 ring-8 ring-[#111113]/80 outline outline-1 outline-white/10"
                : "rounded-xl overflow-hidden"
            }`}
          >
            {previewDevice !== "responsive" && (
              <div className="w-full flex justify-center pb-2 shrink-0 select-none">
                <div className="w-24 h-4 bg-[#111113] rounded-full flex items-center justify-between px-3 text-zinc-650 font-mono text-[9px] border border-white/[0.02]">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-750" />
                  <div className="w-10 h-1 bg-zinc-850 rounded-full" />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-750" />
                </div>
              </div>
            )}

            <div className="flex-1 bg-black rounded-2xl overflow-hidden relative border border-white/[0.04] min-h-0">
              <StudioSandboxPreview
                code={runningCode}
                frameKey={`${runningCode.length}_nocode_revised_frame_${previewDevice}_${isLandscape ? "l" : "p"}`}
                emptyTitle="沙箱暂未加载视图代码"
              />

              {isRefining && (
                <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
                  <div className="relative mb-6">
                    <div className="absolute -inset-4 rounded-full bg-indigo-500/10 animate-ping" />
                    <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-2 border-t-indigo-400 border-r-2 border-r-indigo-400/40 animate-spin flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-100 tracking-wide animate-pulse">
                    AI 正在极速重构界面与逻辑 ...
                  </h4>
                  <div className="mt-3 flex flex-col items-center gap-1.5">
                    <span className="text-[11px] text-zinc-400 font-medium leading-relaxed max-w-[280px]">
                      正在同步底层状态机、重绘 Tailwind 渐变配色并加载核心计算公式，请稍候。
                    </span>
                    {refineInstruction.trim() && (
                      <span className="text-[10px] bg-white/[0.04] text-indigo-400 font-medium border border-indigo-500/20 px-3 py-1.5 rounded-xl max-w-[280px] truncate mt-2">
                        {refineInstruction}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <StudioTelemetryLogPanel
          logs={simulatorLogs}
          showConsole={showConsole}
          title="JARVIS 沙盒交互系统日志巡检终端 (Client Telemetry Logs)"
          onReset={onResetLogs}
          onToggle={onToggleConsole}
        />
      </div>
    </div>
  );
}
