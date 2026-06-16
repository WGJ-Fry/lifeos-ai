import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppWindow, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useI18n } from "../../i18n/I18nProvider";
import type { CustomApp } from "../../types";

export default function ChatWidgetBox({
  widgetName,
  customApps,
  initialExpanded = true,
  children,
}: {
  widgetName: string;
  customApps: CustomApp[];
  initialExpanded?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  useEffect(() => {
    if (!initialExpanded) setIsExpanded(false);
  }, [initialExpanded]);

  let displayName = widgetName;
  if (widgetName === "tasks") displayName = t("chat.widget.tasks");
  else if (widgetName === "notes") displayName = t("chat.widget.notes");
  else if (widgetName === "calendar") displayName = t("chat.widget.calendar");
  else if (widgetName === "calculator") displayName = t("chat.widget.calculator");
  else if (widgetName === "timer") displayName = t("chat.widget.timer");
  else if (widgetName === "navigation") displayName = t("chat.widget.navigation");
  else if (widgetName === "launcher") displayName = t("chat.widget.launcher");
  else {
    const customApp = customApps.find((app) => app.name.toLowerCase() === widgetName.toLowerCase() || app.id === widgetName);
    if (customApp) displayName = customApp.name;
  }

  return (
    <div className="mt-3 flex w-full flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#18181b] shadow-2xl sm:w-[340px]">
      <div
        className={`flex cursor-pointer items-center justify-between border-b px-4 py-3 transition-colors hover:bg-white/[0.02] ${isExpanded ? "border-white/[0.05]" : "border-transparent"}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2 text-sm font-bold text-zinc-300">
          <AppWindow className="h-4 w-4 text-indigo-400" />
          {displayName}
        </span>
        <button className="rounded-full bg-white/[0.05] p-1 text-zinc-500 transition-colors hover:text-white">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0b0b0d] p-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
