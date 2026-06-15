import { Check, FolderSync, Globe, RefreshCw, Server, Signal, SlidersHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { StudioProxyNode } from "./useStudioConnectionSettings";

type RouteMode = "rule" | "global" | "direct" | string;

type StudioProxyTabProps = {
  proxyEnabled: boolean;
  proxyUrl: string;
  routeMode: RouteMode;
  selectedNodeId: string;
  proxyNodes: StudioProxyNode[];
  isSyncingSub: boolean;
  isPinging: boolean;
  subSyncResult: string;
  onToggleProxy: () => void;
  onProxyUrlChange: (value: string) => void;
  onSyncSubscription: () => void;
  onSetProxyEnabled: (enabled: boolean) => void;
  onSelectNode: (id: string) => void;
  onRouteModeChange: (mode: RouteMode) => void;
  onTestAllPings: () => void;
};

export default function StudioProxyTab({
  proxyEnabled,
  proxyUrl,
  routeMode,
  selectedNodeId,
  proxyNodes,
  isSyncingSub,
  isPinging,
  subSyncResult,
  onToggleProxy,
  onProxyUrlChange,
  onSyncSubscription,
  onSetProxyEnabled,
  onSelectNode,
  onRouteModeChange,
  onTestAllPings,
}: StudioProxyTabProps) {
  const selectedNode = proxyNodes.find((node) => node.id === selectedNodeId);

  return (
    <motion.div
      key="proxy"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-3xl mx-auto mt-4"
    >
      <div className="space-y-6">
        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[24px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent blur-3xl pointer-events-none" />
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              <div className="text-left">
                <h3 className="text-lg font-bold text-white leading-none">网络代理与直连 (PROXY / VPN)</h3>
                <p className="text-[11px] text-zinc-500 font-medium mt-1">智能绕过推断中转，避免大模型因封控拒绝访问</p>
              </div>
            </div>
            <button
              onClick={onToggleProxy}
              className={`w-12 h-6 rounded-full relative cursor-pointer border transition-all outline-none duration-250 ${proxyEnabled ? "bg-indigo-600 border-indigo-500" : "bg-white/[0.05] border-white/[0.1]"}`}
            >
              <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-all shadow-md ${proxyEnabled ? "right-1 translate-x-0" : "left-1"}`} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-[#111113] p-5 rounded-2xl border border-white/[0.05]">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider text-left">Clash / V2Ray / SSR 订阅连接导入</label>
                <span className="text-[10px] text-zinc-500">支持加密 YAML / JSON / Base64</span>
              </div>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={proxyUrl}
                  onChange={(event) => onProxyUrlChange(event.target.value)}
                  placeholder="https://subscribe.provider.host/link/token=..."
                  className="w-full bg-[#050505] border border-white/[0.1] text-zinc-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500/50 transition-colors font-mono text-xs placeholder:text-zinc-700"
                />
                <button
                  type="button"
                  onClick={onSyncSubscription}
                  disabled={isSyncingSub}
                  className="px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all font-bold text-xs text-indigo-400 rounded-xl border border-indigo-500/30 whitespace-nowrap flex items-center gap-1.5"
                >
                  {isSyncingSub ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      正在拉取...
                    </>
                  ) : (
                    <>
                      <FolderSync className="w-3.5 h-3.5" />
                      导入/更新节点
                    </>
                  )}
                </button>
              </div>

              {subSyncResult && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-3 p-3 rounded-xl border text-xs font-mono leading-relaxed text-left ${
                    subSyncResult.includes("成功") ? "bg-indigo-500/5 border-indigo-500/10 text-indigo-300" : "bg-white/[0.02] border-white/[0.05] text-zinc-500"
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${subSyncResult.includes("成功") ? "bg-indigo-400 animate-pulse" : "bg-zinc-500"}`} />
                    <span>{subSyncResult}</span>
                  </div>
                </motion.div>
              )}

              {subSyncResult && subSyncResult.includes("成功") && proxyNodes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 pt-4 border-t border-white/[0.05] text-left"
                >
                  <div className="text-xs font-bold text-zinc-400 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <Server className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      请手动选择连接的节点 / Select Target Node
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      当前选中: {selectedNode?.name || "未连接"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {proxyNodes.map((node) => {
                      const isSelected = selectedNodeId === node.id;
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => {
                            onSelectNode(node.id);
                            if (!proxyEnabled) {
                              onSetProxyEnabled(true);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between h-auto shrink-0 ${
                            isSelected
                              ? "bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                              : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.15] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 w-full mb-1">
                            <span className={`text-[11px] font-bold truncate ${isSelected ? "text-indigo-300" : "text-zinc-300 group-hover:text-zinc-200"}`}>
                              {node.name}
                            </span>
                            <span className={`text-[9px] shrink-0 font-mono font-bold px-1.5 py-0.5 rounded ${
                              node.delay < 0
                                ? "text-zinc-600 bg-zinc-600/10 border border-white/[0.05]"
                                : node.delay < 35
                                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                  : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                            }`}>
                              {node.delay < 0 ? "Timeout" : `${node.delay} ms`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center w-full mt-1.5">
                            <span className="text-[9px] text-zinc-500 font-mono uppercase bg-white/[0.03] px-1 py-0.2 rounded border border-white/[0.05]">{node.type}</span>
                            <span className="text-[9px] text-zinc-500 font-mono tracking-tight">{node.speed}</span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-bl-md flex items-center justify-center">
                              <div className="w-1 h-2 bg-white rounded-full animate-pulse" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            {proxyEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4"
              >
                <div className="bg-[#111113] p-4 rounded-2xl border border-white/[0.05]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                      系统分流路由策略
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">PROXY RULESET</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-[#050505] p-1.5 rounded-xl border border-white/[0.05]">
                    {[
                      { value: "rule", label: "分流模式 (Rule)" },
                      { value: "global", label: "全局代理 (Global)" },
                      { value: "direct", label: "直接连接 (Direct)" },
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => onRouteModeChange(mode.value)}
                        className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
                          routeMode === mode.value
                            ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-inner"
                            : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111113] p-5 rounded-2xl border border-white/[0.05]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-indigo-400" />
                      可用中继加速节点 ({proxyNodes.length})
                    </span>
                    <button
                      type="button"
                      onClick={onTestAllPings}
                      disabled={isPinging}
                      className="px-3 py-1 bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-50 text-[10px] font-bold text-zinc-300 rounded-lg border border-white/[0.05] transition-all flex items-center gap-1.5 w-24 justify-center"
                    >
                      <RefreshCw className={`w-3 h-3 ${isPinging ? "animate-spin" : ""}`} />
                      {isPinging ? "测速中..." : "测延迟"}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {proxyNodes.map((node) => {
                      const isSelected = selectedNodeId === node.id;
                      const isOffline = node.delay < 0;
                      return (
                        <div
                          key={node.id}
                          onClick={() => onSelectNode(node.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-left ${
                            isSelected
                              ? "bg-indigo-500/10 border-indigo-500/40 shadow-inner"
                              : "bg-[#050505] border-white/[0.05] hover:border-white/[0.15] hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                                : "bg-[#111113] border-white/[0.05] text-zinc-500"
                            }`}>
                              {isSelected ? (
                                <Check className="w-3.5 h-3.5 animate-scale-up" />
                              ) : (
                                <Signal className="w-3 h-3 text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-zinc-200 truncate">{node.name}</div>
                              <div className="text-[10px] text-zinc-500 flex gap-2 items-center mt-1">
                                <span className="px-1.5 py-0.2 bg-white/[0.03] rounded border border-white/[0.05] shrink-0">{node.type}</span>
                                <span className="truncate">下行速率: {node.speed}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {isOffline ? (
                              <span className="text-[10px] font-bold text-zinc-600 bg-zinc-600/10 px-2 py-0.5 rounded border border-white/[0.05]">Timeout</span>
                            ) : (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                node.delay < 30
                                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                  : node.delay < 70
                                    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                    : "text-zinc-400 bg-white/[0.04] border-white/[0.06]"
                              }`}>
                                {node.delay} ms
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
