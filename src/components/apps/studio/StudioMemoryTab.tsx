import { Brain, FolderSync, Plus, Sparkles, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useI18n } from "../../../i18n/I18nProvider";

export type StudioMemoryItem = {
  id: string;
  title: string;
  content: string;
  time?: string;
};

type StudioMemoryTabProps = {
  memories: StudioMemoryItem[];
  isAddingMemory: boolean;
  newMemoryTitle: string;
  newMemoryContent: string;
  onStartAdding: () => void;
  onCancelAdding: () => void;
  onChangeTitle: (value: string) => void;
  onChangeContent: (value: string) => void;
  onAddMemory: () => void;
  onDeleteMemory: (id: string) => void;
};

export default function StudioMemoryTab({
  memories,
  isAddingMemory,
  newMemoryTitle,
  newMemoryContent,
  onStartAdding,
  onCancelAdding,
  onChangeTitle,
  onChangeContent,
  onAddMemory,
  onDeleteMemory,
}: StudioMemoryTabProps) {
  const { t } = useI18n();

  return (
    <motion.div
      key="memory"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto mt-4 space-y-6"
    >
      <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[32px] p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent blur-3xl pointer-events-none" />
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <FolderSync className="w-5 h-5 text-indigo-400" />
          {t("studio.memory.loadCenterTitle")}
        </h3>
        <p className="text-zinc-400 text-sm font-medium mb-6 leading-relaxed">
          {t("studio.memory.loadCenterBody")}
        </p>
        <div
          className="p-8 border-2 border-dashed border-white/[0.05] hover:border-indigo-500/45 hover:bg-white/[0.02] rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group text-center"
          onClick={() => alert(t("studio.memory.uploadHintAlert"))}
        >
          <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-250">
            <Sparkles className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400" />
          </div>
          <div className="font-bold text-zinc-200 mb-1">{t("studio.memory.uploadTitle")}</div>
          <div className="text-xs text-zinc-500 font-medium leading-relaxed">{t("studio.memory.uploadBody")}</div>
        </div>
      </div>

      <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[32px] p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Brain className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-white">{t("studio.memory.title")}</h2>
            <p className="text-zinc-500 text-xs font-medium mt-0.5">{t("studio.memory.subtitle")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-sans">
          {memories.map((memory) => (
            <div key={memory.id} className="bg-[#111113] p-5 rounded-[24px] border border-white/[0.05] hover:border-emerald-500/20 transition-all flex flex-col justify-between group">
              <div>
                <div className="text-sm font-bold text-zinc-200 mb-1 flex justify-between items-center">
                  <span className="group-hover:text-emerald-400 transition-colors">{memory.title}</span>
                  <button
                    onClick={() => onDeleteMemory(memory.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10"
                    title={t("studio.memory.deleteTitle")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">{memory.time}</p>
              </div>
              <div className="mt-4 text-xs text-emerald-400 bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/25 font-sans leading-relaxed break-all">
                {memory.content}
              </div>
            </div>
          ))}

          {!isAddingMemory ? (
            <div
              onClick={onStartAdding}
              className="p-5 border border-dashed border-white/[0.08] hover:border-emerald-500/50 hover:bg-white/[0.01] rounded-[24px] flex flex-col items-center justify-center transition-all cursor-pointer group text-center min-h-[145px]"
            >
              <Plus className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 mb-2 transition-transform group-hover:scale-110" />
              <div className="font-bold text-zinc-400 text-xs group-hover:text-zinc-200 transition-colors">{t("studio.memory.addCustom")}</div>
              <p className="text-[10px] text-zinc-600 mt-1">{t("studio.memory.addCustomHint")}</p>
            </div>
          ) : (
            <div className="bg-[#111113] p-5 rounded-[24px] border border-emerald-500/30 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex justify-between">
                  <span>{t("studio.memory.newRecord")}</span>
                  <span className="text-[10px] text-zinc-600">{t("studio.memory.injectEdgeMemory")}</span>
                </div>

                <input
                  type="text"
                  placeholder={t("studio.memory.titlePlaceholder")}
                  value={newMemoryTitle}
                  onChange={(event) => onChangeTitle(event.target.value)}
                  className="w-full bg-[#050505] border border-white/[0.1] text-zinc-200 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500/55 transition-all text-left"
                />

                <textarea
                  placeholder={t("studio.memory.contentPlaceholder")}
                  value={newMemoryContent}
                  onChange={(event) => onChangeContent(event.target.value)}
                  className="w-full bg-[#050505] border border-white/[0.1] text-zinc-200 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500/55 transition-all resize-none h-18 text-left"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-white/[0.03]">
                <button
                  onClick={onCancelAdding}
                  className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  {t("studio.memory.cancel")}
                </button>
                <button
                  onClick={onAddMemory}
                  className="bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all shadow-md active:scale-95"
                >
                  {t("studio.memory.confirmLoad")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
