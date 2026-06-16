import { useState } from "react";
import { Plus, Check, Trash2, CheckCircle2, Circle, Filter, Sparkles, FolderClosed, Trash, AlertTriangle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSyncedClientState } from "../../hooks/useSyncedClientState";
import { useI18n } from "../../i18n/I18nProvider";

interface TaskItem {
  id: number;
  text: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  createdAt: number;
}

export default function TasksApp() {
  const { t } = useI18n();
  const [tasks, setTasks] = useSyncedClientState<TaskItem[]>("lifeos_tasks_pro", [
    { id: 1, text: t("apps.tasks.default1"), completed: true, priority: "high", createdAt: Date.now() - 3600000 },
    { id: 2, text: t("apps.tasks.default2"), completed: false, priority: "medium", createdAt: Date.now() },
    { id: 3, text: t("apps.tasks.default3"), completed: false, priority: "high", createdAt: Date.now() + 3000 }
  ]);
  
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: TaskItem = {
      id: Date.now(),
      text: newTaskText.trim(),
      completed: false,
      priority: newTaskPriority,
      createdAt: Date.now()
    };
    setTasks([newTask, ...tasks]);
    setNewTaskText("");
    setNewTaskPriority("medium"); // default
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const clearCompleted = () => {
    setTasks(tasks.filter((t) => !t.completed));
  };

  // Filter tasks based on selected tab
  const filteredTasks = tasks.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const getPriorityStyle = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-red-500/10 border-red-500/20 text-red-400Icon",
          dot: "bg-red-400",
          label: t("apps.tasks.priority.high"),
          textColor: "text-red-400"
        };
      case "medium":
        return {
          bg: "bg-amber-500/10 border-amber-500/20 text-amber-400Icon",
          dot: "bg-amber-400",
          label: t("apps.tasks.priority.medium"),
          textColor: "text-amber-400"
        };
      case "low":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400Icon",
          dot: "bg-emerald-400",
          label: t("apps.tasks.priority.low"),
          textColor: "text-emerald-400"
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111113] text-zinc-100 p-5 font-sans justify-between relative select-none">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 h-10 flex-shrink-0">
        <h3 className="font-semibold text-[14px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          {t("apps.tasks.title")}
        </h3>
        <span className="text-[11px] text-zinc-300 font-medium bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/15">
          {t("apps.tasks.activeCount", { count: String(tasks.filter((t) => !t.completed).length) })}
        </span>
      </div>

      {/* Input Sorter section */}
      <div className="space-y-2 mt-3 flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder={t("apps.tasks.placeholder")}
            className="w-full bg-[#18181b] border border-white/[0.05] rounded-xl py-2.5 pl-3.5 pr-12 text-xs font-semibold text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500/30 transition-all font-sans"
          />
          <button
            onClick={addTask}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer"
            title={t("apps.tasks.add")}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Priority switcher for new task */}
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold px-1 py-0.5">
          <span>{t("apps.tasks.priorityLabel")}</span>
          {(["high", "medium", "low"] as const).map((p) => {
            const isSelected = newTaskPriority === p;
            const style = getPriorityStyle(p);
            return (
              <button
                key={p}
                onClick={() => setNewTaskPriority(p)}
                className={`px-2 py-0.5 rounded transition-all border ${
                  isSelected
                    ? `${p === "high" ? "bg-red-500/15 border-red-500/30 text-red-400" : p === "medium" ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"}`
                    : "border-transparent text-zinc-500 hover:text-zinc-400"
                }`}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs / Clear completed action */}
      <div className="flex items-center justify-between border-b border-white/[0.03] py-2 flex-shrink-0">
        <div className="flex bg-white/[0.02] p-0.5 rounded-lg border border-white/[0.03]">
          {(["all", "active", "completed"] as const).map((tab) => {
            const labelMap = { all: t("apps.tasks.filter.all"), active: t("apps.tasks.filter.active"), completed: t("apps.tasks.filter.completed") };
            const isSelected = filter === tab;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-all ${
                  isSelected
                    ? "bg-white/[0.07] text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>

        {tasks.some((t) => t.completed) && (
          <button
            onClick={clearCompleted}
            className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer font-bold"
          >
            <Trash className="w-3 h-3" />
            {t("apps.tasks.clearCompleted")}
          </button>
        )}
      </div>

      {/* Tasks Queue scroll area list */}
      <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 hide-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-zinc-650 text-center py-12 text-zinc-500 font-semibold"
            >
              {t("apps.tasks.empty")}
            </motion.div>
          ) : (
            filteredTasks.map((task) => {
              const style = getPriorityStyle(task.priority);
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                    task.completed
                      ? "bg-zinc-800/10 border-white/[0.01] opacity-50"
                      : "bg-zinc-800/20 border-white/[0.04] hover:border-white/[0.1] hover:bg-zinc-800/30"
                  }`}
                >
                  <div
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                  >
                    <div className="flex-shrink-0">
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400" />
                      )}
                    </div>

                    <div className="text-left flex-1 min-w-0 pr-1">
                      <span
                        className={`text-xs select-none break-all block font-semibold ${
                          task.completed
                            ? "line-through text-zinc-500"
                            : "text-zinc-200"
                        }`}
                      >
                        {task.text}
                      </span>
                      
                      {/* Priority pill indicator */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                        <span className={`text-[9px] font-bold ${style.textColor}`}>{style.label}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-white/[0.03] transition-all flex-shrink-0"
                    title={t("apps.tasks.delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
