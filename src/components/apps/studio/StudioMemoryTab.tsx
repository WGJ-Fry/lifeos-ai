import { Brain, FolderSync, Plus, Sparkles, Trash2 } from "lucide-react";
import { motion } from "motion/react";

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
          数据与组件装载中心
        </h3>
        <p className="text-zinc-400 text-sm font-medium mb-6 leading-relaxed">
          在此将外部数据（如 JSON 配置文件、记忆快照，或第三方编写的工坊应用源码）直接装载入您管家的数据枢纽中。
        </p>
        <div
          className="p-8 border-2 border-dashed border-white/[0.05] hover:border-indigo-500/45 hover:bg-white/[0.02] rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group text-center"
          onClick={() => alert("功能已接入: 请直接在终端发送“这个”的内容附件给助理管家！")}
        >
          <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-250">
            <Sparkles className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400" />
          </div>
          <div className="font-bold text-zinc-200 mb-1">点此或拖拽文件以上传装载</div>
          <div className="text-xs text-zinc-500 font-medium leading-relaxed">支持 JSON, 结构化文档, 各种自定义应用代码 (建议：您也可以直连在对话框里发给助理处理)</div>
        </div>
      </div>

      <div className="bg-[#0b0b0d] border border-white/[0.05] rounded-[32px] p-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Brain className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-white">个人习惯与专属记忆库</h2>
            <p className="text-zinc-500 text-xs font-medium mt-0.5">基于长期交互提取并安全加密存放的习惯图谱</p>
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
                    title="擦除记忆"
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
              <div className="font-bold text-zinc-400 text-xs group-hover:text-zinc-200 transition-colors">添加自定义习惯 / 专属记忆</div>
              <p className="text-[10px] text-zinc-600 mt-1">注入关于您的习惯 preferences，让管家更懂您的交互逻辑</p>
            </div>
          ) : (
            <div className="bg-[#111113] p-5 rounded-[24px] border border-emerald-500/30 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex justify-between">
                  <span>新增习惯/偏好记录</span>
                  <span className="text-[10px] text-zinc-600">注入端侧内存</span>
                </div>

                <input
                  type="text"
                  placeholder="输入记忆主题 (例如: 晚间智能温控意见)"
                  value={newMemoryTitle}
                  onChange={(event) => onChangeTitle(event.target.value)}
                  className="w-full bg-[#050505] border border-white/[0.1] text-zinc-200 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500/55 transition-all text-left"
                />

                <textarea
                  placeholder="写下具体的日常习惯规则 (例如: 到了晚上11点后，希望背景声轻柔一些。)"
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
                  取消
                </button>
                <button
                  onClick={onAddMemory}
                  className="bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all shadow-md active:scale-95"
                >
                  确定装载
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
