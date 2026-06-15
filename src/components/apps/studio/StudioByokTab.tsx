import { Activity, AlertCircle, CheckCircle2, LockKeyhole, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

type ApiTestStatus = "idle" | "testing" | "success" | "error";

type StudioByokTabProps = {
  provider: string;
  apiKey: string;
  apiTestStatus: ApiTestStatus;
  apiTestResult: string;
  onProviderChange: (provider: string) => void;
  onKeyChange: (apiKey: string) => void;
  onTestConnection: () => void;
};

export default function StudioByokTab({
  provider,
  apiKey,
  apiTestStatus,
  apiTestResult,
  onProviderChange,
  onKeyChange,
  onTestConnection,
}: StudioByokTabProps) {
  return (
    <motion.div
      key="byok"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-3xl mx-auto mt-4"
    >
      <div className="space-y-6">
        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[24px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent blur-3xl pointer-events-none" />
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <LockKeyhole className="w-5 h-5 text-indigo-400" />
              大语言模型枢纽 (BYOK)
            </h3>
            <span className="text-xs text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 font-medium text-[11px]">离线沙盒自锁已启用</span>
          </div>

          <div className="bg-[#111113] p-5 rounded-2xl border border-white/[0.05] flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">模型供应商 / API Provider</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={(event) => onProviderChange(event.target.value)}
                  className="w-full bg-[#050505] border border-white/[0.1] text-zinc-200 rounded-xl px-4 py-3 appearance-none outline-none focus:border-indigo-500/50 transition-colors font-medium text-sm"
                >
                  <option value="Google Gemini (推荐)">Google Gemini (推荐)</option>
                  <option value="OpenAI">OpenAI (GPT Engine)</option>
                  <option value="OpenRouter">OpenRouter (多模型路由)</option>
                  <option value="本地模型">本地模型 (OpenAI-Compatible)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">密钥 API Key</label>
                <span className="text-[10px] text-zinc-500 font-medium">保存在电脑端安全存储</span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => onKeyChange(event.target.value)}
                  placeholder={provider.includes("本地") ? "http://127.0.0.1:11434/v1" : provider.includes("Gemini") ? "AIzaSy..." : "sk-........................"}
                  className="w-full bg-[#050505] border border-white/[0.1] text-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors font-mono text-xs placeholder:text-zinc-700 pr-12"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  {apiKey ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="秘钥已输入" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-zinc-600" title="待输入" />
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onTestConnection}
                disabled={apiTestStatus === "testing"}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-indigo-500/40 disabled:to-purple-500/40 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {apiTestStatus === "testing" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    正在拨测物理信道 API...
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5" />
                    一键诊断秘钥连接 / Test API Connection
                  </>
                )}
              </button>

              {apiTestStatus !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-3 p-3.5 rounded-xl border text-xs font-mono leading-relaxed text-left ${
                    apiTestStatus === "testing" ? "bg-white/[0.02] border-white/[0.05] text-zinc-400" :
                    apiTestStatus === "success" ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" :
                    "bg-rose-500/5 border-rose-500/10 text-rose-400"
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    {apiTestStatus === "testing" && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping mt-1.5 shrink-0" />}
                    {apiTestStatus === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {apiTestStatus === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    <span className="flex-1 whitespace-pre-line">{apiTestResult}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
