import { Sparkles } from "lucide-react";
import type { DragEvent } from "react";
import { useI18n } from "../../../i18n/I18nProvider";

export default function StudioDragOverlay({
  onDragLeave,
  onDrop,
}: {
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center border border-dashed border-indigo-500/40 bg-[#050505]/95 p-8 text-center backdrop-blur-xl"
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10">
        <Sparkles className="h-10 w-10 animate-pulse text-indigo-400" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-white sm:text-2xl">{t("studio.drag.title")}</h3>
      <p className="max-w-lg text-xs font-semibold leading-relaxed text-zinc-400 sm:text-sm">
        {t("studio.drag.line1Prefix")} <span className="font-mono font-semibold text-indigo-400">.tsx, .jsx, .vue, .html, .py, .java, .js, .json, .txt</span> {t("studio.drag.line1Suffix")}
        <br />
        {t("studio.drag.line2")}
      </p>
    </div>
  );
}
