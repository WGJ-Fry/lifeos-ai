import { Fingerprint, FolderSync, Play, Trash2 } from "lucide-react";
import { motion } from "motion/react";

type StudioSettingsTabProps = {
  modelEngine: string;
  ttsVoice: string;
  onModelEngineChange: (value: string) => void;
  onTtsVoiceChange: (value: string) => void;
  onClearAllData: () => void;
  onBackupData: () => void;
};

function previewVoice(ttsVoice: string) {
  if (!window.speechSynthesis) {
    alert("该设备暂不支持端侧智能语音合成能力");
    return;
  }

  window.speechSynthesis.cancel();
  let promptText = "主频语音信信道对齐完毕。";
  if (ttsVoice.includes("Onyx")) {
    promptText = "主人，我是您的 Onyx 语音模块。已完成自适应校准，随时为您规划数字行程。";
  } else if (ttsVoice.includes("Alloy")) {
    promptText = "你好呀，我是 Alloy。新的一天，我已经为您准备好了晨间习惯同步哦！";
  } else if (ttsVoice.includes("Echo")) {
    promptText = "报告主管，Echo 模块测试成功。已安全连线大百科知识图谱，请指示。";
  } else if (ttsVoice.includes("Shimmer")) {
    promptText = "您好，系统已接入 Shimmer 协议。我可以协助您校对软件代码及开展练习。";
  }

  const utterance = new SpeechSynthesisUtterance(promptText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find((voice) => voice.lang.includes("zh") || voice.name.includes("Chinese") || voice.name.includes("Google"));
  if (zhVoice) {
    utterance.voice = zhVoice;
  }
  window.speechSynthesis.speak(utterance);
}

export default function StudioSettingsTab({
  modelEngine,
  ttsVoice,
  onModelEngineChange,
  onTtsVoiceChange,
  onClearAllData,
  onBackupData,
}: StudioSettingsTabProps) {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-3xl mx-auto mt-4"
    >
      <div className="space-y-6">
        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[24px] p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4 text-left">大语言模型推断引擎 与 智能语音</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 bg-[#111113] rounded-2xl border border-white/[0.05]">
              <div className="text-left">
                <div className="font-bold text-zinc-200 mb-1 text-sm">主控模型版本</div>
                <div className="text-xs text-zinc-500 font-mono text-indigo-400">分流模式下优先调用：{modelEngine}</div>
              </div>
              <div className="relative">
                <select
                  value={modelEngine}
                  onChange={(event) => onModelEngineChange(event.target.value)}
                  className="w-[155px] bg-[#050505] border border-white/[0.1] text-zinc-200 text-xs rounded-xl px-3 py-2 outline-none appearance-none font-bold"
                >
                  <option value="Gemini 2.0 Flash">Gemini 2.0 Flash</option>
                  <option value="Gemini 1.5 Pro">Gemini 1.5 Pro</option>
                  <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                  <option value="GPT-4o">GPT-4o</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400 text-[10px]">
                  v
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#111113] rounded-2xl border border-white/[0.05]">
              <div className="text-left">
                <div className="font-bold text-zinc-200 mb-1 text-sm">管家音色模板 (TTS)</div>
                <div className="text-xs text-zinc-400 font-mono text-emerald-400">目前选定：{ttsVoice}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={ttsVoice}
                    onChange={(event) => onTtsVoiceChange(event.target.value)}
                    className="w-[160px] bg-[#050505] border border-white/[0.1] text-zinc-200 text-xs rounded-xl px-3 py-2 outline-none appearance-none font-bold"
                  >
                    <option value="Onyx (深沉星空男声)">Onyx 男声 (深沉)</option>
                    <option value="Alloy (温柔工作女声)">Alloy 女声 (温柔)</option>
                    <option value="Echo (干练专业中性)">Echo 中声 (专业)</option>
                    <option value="Shimmer (知性学术女声)">Shimmer 女声 (知性)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400 text-[10px]">
                    v
                  </div>
                </div>
                <button
                  onClick={() => previewVoice(ttsVoice)}
                  className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/20 active:scale-95 transition-all flex items-center justify-center shrink-0"
                  title="试听音质"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[24px] p-6 font-sans">
          <h3 className="text-lg font-bold text-white mb-4">视觉与交互体系</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl cursor-pointer">
              <div className="w-full h-20 bg-[#050505] rounded-xl border border-white/[0.05] mb-3 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-400">Cosmic Dark (启用中)</span>
              </div>
              <div className="text-sm font-bold text-white text-center">深层宇宙灰</div>
            </div>
            <div
              onClick={() => alert("为适应本系统极致极客管家属性，推荐继续使用极致优雅的 Cosmic Dark 主题。")}
              className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl cursor-pointer hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-full h-20 bg-[#f4f4f5] rounded-xl border border-black/5 mb-3 flex items-center justify-center">
                <span className="text-xs font-bold text-zinc-500">Snow Light</span>
              </div>
              <div className="text-sm font-bold text-zinc-300 text-center">雪域极白</div>
            </div>
          </div>
        </div>

        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[24px] p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-indigo-400" />
            隐私与安全资产
          </h3>
          <div className="flex flex-col gap-3">
            <div
              onClick={onClearAllData}
              className="flex items-center justify-between p-4 hover:bg-red-500/5 rounded-2xl cursor-pointer border border-transparent hover:border-red-500/20 transition-all font-sans"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl"><Trash2 className="w-5 h-5" /></div>
                <div className="text-left font-sans">
                  <div className="font-bold text-red-400 text-sm">擦除所有历史聊天及状态</div>
                  <div className="text-xs text-zinc-500 mt-1">不可逆转，重新装载纯净出厂配置并清空所有端侧存储库</div>
                </div>
              </div>
            </div>

            <div
              onClick={onBackupData}
              className="flex items-center justify-between p-4 hover:bg-indigo-500/5 rounded-2xl cursor-pointer border border-transparent hover:border-indigo-500/20 transition-all animate-fade-in font-sans"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-zinc-800 text-zinc-300 rounded-xl"><FolderSync className="w-5 h-5" /></div>
                <div className="text-left font-sans">
                  <div className="font-bold text-zinc-200 text-sm">全量备份个人空间资产</div>
                  <div className="text-xs text-zinc-500 mt-1">包含了所有工坊自定义代码段及个人偏好记忆快照 JSON 文档</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
