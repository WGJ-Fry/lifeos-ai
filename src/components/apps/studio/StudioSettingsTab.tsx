import { Fingerprint, FolderSync, Play, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useI18n } from "../../../i18n/I18nProvider";
import type { TranslationKey } from "../../../i18n/translations";

type StudioSettingsTabProps = {
  modelEngine: string;
  ttsVoice: string;
  onModelEngineChange: (value: string) => void;
  onTtsVoiceChange: (value: string) => void;
  onClearAllData: () => void;
  onBackupData: () => void;
};

function voicePromptKey(ttsVoice: string): TranslationKey {
  if (ttsVoice.includes("Onyx")) return "studio.settings.voicePromptOnyx";
  if (ttsVoice.includes("Alloy")) return "studio.settings.voicePromptAlloy";
  if (ttsVoice.includes("Echo")) return "studio.settings.voicePromptEcho";
  if (ttsVoice.includes("Shimmer")) return "studio.settings.voicePromptShimmer";
  return "studio.settings.voicePromptDefault";
}

function previewVoice(ttsVoice: string, unsupportedMessage: string, promptText: string) {
  if (!window.speechSynthesis) {
    alert(unsupportedMessage);
    return;
  }

  window.speechSynthesis.cancel();
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
  const { t } = useI18n();

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
          <h3 className="text-lg font-bold text-white mb-4 text-left">{t("studio.settings.engineVoiceTitle")}</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 bg-[#111113] rounded-2xl border border-white/[0.05]">
              <div className="text-left">
                <div className="font-bold text-zinc-200 mb-1 text-sm">{t("studio.settings.modelVersion")}</div>
                <div className="text-xs text-zinc-500 font-mono text-indigo-400">{t("studio.settings.modelHint", { model: modelEngine })}</div>
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
                <div className="font-bold text-zinc-200 mb-1 text-sm">{t("studio.settings.ttsTemplate")}</div>
                <div className="text-xs text-zinc-400 font-mono text-emerald-400">{t("studio.settings.currentVoice", { voice: ttsVoice })}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={ttsVoice}
                    onChange={(event) => onTtsVoiceChange(event.target.value)}
                    className="w-[160px] bg-[#050505] border border-white/[0.1] text-zinc-200 text-xs rounded-xl px-3 py-2 outline-none appearance-none font-bold"
                  >
                    <option value="Onyx">{t("studio.settings.voiceOnyx")}</option>
                    <option value="Alloy">{t("studio.settings.voiceAlloy")}</option>
                    <option value="Echo">{t("studio.settings.voiceEcho")}</option>
                    <option value="Shimmer">{t("studio.settings.voiceShimmer")}</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400 text-[10px]">
                    v
                  </div>
                </div>
                <button
                  onClick={() => previewVoice(ttsVoice, t("studio.settings.voiceUnsupported"), t(voicePromptKey(ttsVoice)))}
                  className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/20 active:scale-95 transition-all flex items-center justify-center shrink-0"
                  title={t("studio.settings.previewVoice")}
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[24px] p-6 font-sans">
          <h3 className="text-lg font-bold text-white mb-4">{t("studio.settings.visualTitle")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl cursor-pointer">
              <div className="w-full h-20 bg-[#050505] rounded-xl border border-white/[0.05] mb-3 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-400">{t("studio.settings.cosmicDarkEnabled")}</span>
              </div>
              <div className="text-sm font-bold text-white text-center">{t("studio.settings.cosmicDark")}</div>
            </div>
            <div
              onClick={() => alert(t("studio.settings.themeRecommend"))}
              className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl cursor-pointer hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-full h-20 bg-[#f4f4f5] rounded-xl border border-black/5 mb-3 flex items-center justify-center">
                <span className="text-xs font-bold text-zinc-500">Snow Light</span>
              </div>
              <div className="text-sm font-bold text-zinc-300 text-center">{t("studio.settings.snowLight")}</div>
            </div>
          </div>
        </div>

        <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[24px] p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-indigo-400" />
            {t("studio.settings.privacyTitle")}
          </h3>
          <div className="flex flex-col gap-3">
            <div
              onClick={onClearAllData}
              className="flex items-center justify-between p-4 hover:bg-red-500/5 rounded-2xl cursor-pointer border border-transparent hover:border-red-500/20 transition-all font-sans"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl"><Trash2 className="w-5 h-5" /></div>
                <div className="text-left font-sans">
                  <div className="font-bold text-red-400 text-sm">{t("studio.settings.clearAll")}</div>
                  <div className="text-xs text-zinc-500 mt-1">{t("studio.settings.clearAllHint")}</div>
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
                  <div className="font-bold text-zinc-200 text-sm">{t("studio.settings.backupAssets")}</div>
                  <div className="text-xs text-zinc-500 mt-1">{t("studio.settings.backupAssetsHint")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
