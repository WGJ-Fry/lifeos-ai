import { Settings2 } from "lucide-react";
import { motion } from "motion/react";
import { useI18n } from "../../i18n/I18nProvider";

export default function LocalSettingsModal({
  onClose,
  onSave,
  saveStatus,
}: {
  onClose: () => void;
  onSave: () => void;
  saveStatus: string | null;
}) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl sm:p-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-[32px] border border-white/[0.1] bg-[#111113] font-sans shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#18181b] p-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Settings2 className="h-5 w-5 text-indigo-400" />
            {t("chat.localSettings.title")}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-zinc-400 transition-colors hover:bg-white/[0.1]">
            ×
          </button>
        </div>

        <div className="hide-scrollbar max-h-[60vh] space-y-6 overflow-y-auto p-6">
          <div>
            <h4 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-zinc-500">{t("chat.localSettings.node")}</h4>
            <div className="rounded-[20px] border border-white/[0.05] bg-[#18181b] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[15px] font-medium text-zinc-200">{t("chat.localSettings.desktopService")}</span>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-400">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> {t("chat.localSettings.connected")}
                </div>
              </div>
              <div className="font-mono text-[13px] tracking-wide text-zinc-500">IP: 192.168.3.107:3000</div>
            </div>
          </div>

          <div className="pt-2">
            <div className="mb-6 flex items-start gap-3 rounded-[20px] border border-amber-500/20 bg-amber-500/10 p-4">
              <span className="mt-0.5 text-amber-500">!</span>
              <p className="text-[13px] font-medium leading-relaxed text-amber-500/80">
                {t("chat.localSettings.warning")}
              </p>
            </div>

            <button onClick={onSave} className="flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3.5 font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95">
              {saveStatus || t("chat.localSettings.save")}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
