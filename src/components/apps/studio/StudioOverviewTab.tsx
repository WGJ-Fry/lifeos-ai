import { Activity, Brain, Cpu, Globe, Terminal, Zap } from "lucide-react";
import { motion } from "motion/react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "../../../i18n/I18nProvider";
import { CustomApp } from "../../../types";
import { mockLogs, performanceData } from "./constants";
import StudioTelemetryLogPanel, { StudioTelemetryLog } from "./StudioTelemetryLogPanel";
import { StudioProxyNode } from "./useStudioConnectionSettings";

type StudioOverviewTabProps = {
  customApps: CustomApp[];
  memoriesCount: number;
  modelEngine: string;
  ttsVoice: string;
  proxyEnabled: boolean;
  proxyNodes: StudioProxyNode[];
  selectedNodeId: string;
  simulatorLogs: StudioTelemetryLog[];
  showConsole: boolean;
  onResetLogs: () => void;
  onToggleConsole: () => void;
  onOpenSettings: () => void;
};

export default function StudioOverviewTab({
  customApps,
  memoriesCount,
  modelEngine,
  ttsVoice,
  proxyEnabled,
  proxyNodes,
  selectedNodeId,
  simulatorLogs,
  showConsole,
  onResetLogs,
  onToggleConsole,
  onOpenSettings,
}: StudioOverviewTabProps) {
  const { t } = useI18n();
  const selectedNode = proxyNodes.find((node) => node.id === selectedNodeId);

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-2xl p-5 flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t("studio.overview.engine")}</span>
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-white truncate">{modelEngine}</h4>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">Voice: {ttsVoice.split(" ")[0]}</p>
          </div>

          <StudioTelemetryLogPanel
            compact
            logs={simulatorLogs}
            showConsole={showConsole}
            title="TELEMETRY LOGS"
            onReset={onResetLogs}
            onToggle={onToggleConsole}
          />
        </div>

        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-2xl p-5 flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t("studio.overview.relay")}</span>
            <Globe className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-white truncate">
              {proxyEnabled ? (selectedNode?.name || t("studio.overview.secureDirectChannel")) : t("studio.overview.localLoop")}
            </h4>
            <p className="text-[10px] text-emerald-400 mt-1 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Delay: {proxyEnabled ? (selectedNode?.delay || 0) : 2} ms
            </p>
          </div>
        </div>

        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-2xl p-5 flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-sans">{t("studio.overview.workshopStatus")}</span>
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white">{customApps.length} <span className="text-xs text-zinc-500 font-medium">{t("studio.overview.microApps")}</span></h4>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">Sandbox Level: Isolated</p>
          </div>
        </div>

        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-2xl p-5 flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t("studio.overview.memory")}</span>
            <Brain className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white">{memoriesCount} <span className="text-xs text-zinc-500 font-medium">{t("studio.overview.memoryPairs")}</span></h4>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">Encryption: Local DB</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[24px] p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              {t("studio.overview.realtimeFlow")}
            </h3>
            <span className="text-[10px] bg-white/[0.05] text-zinc-400 px-2 py-0.5 rounded font-mono">{t("studio.overview.unitRequests")}</span>
          </div>
          <div className="h-56 w-full font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#111113", borderColor: "rgba(255,255,255,0.08)" }} />
                <Area type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[24px] p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Terminal className="w-4 h-4 text-indigo-400" />
              {t("studio.overview.kernelPolling")}
            </h3>
            <div className="space-y-3">
              {mockLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${log.status === "success" ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
                    <span className="text-zinc-300 font-medium">{log.action}</span>
                  </div>
                  <span className="text-zinc-500 text-[10px] font-mono">{log.time}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full mt-4 py-2.5 rounded-xl border border-dashed border-white/[0.1] hover:border-indigo-400/40 text-center text-xs font-bold text-zinc-400 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1.5"
          >
            {t("studio.overview.openSettings")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
