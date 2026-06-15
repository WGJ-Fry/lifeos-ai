import { useState } from "react";
import { Plus, StickyNote, ChevronRight, ChevronLeft, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSyncedClientState } from "../../hooks/useSyncedClientState";

type NoteItem = {
  id: number;
  title: string;
  content: string;
};

export default function NotesApp() {
  const [notes, setNotes] = useSyncedClientState<NoteItem[]>("lifeos_notes", [
    { id: 1, title: "LifeOS 构想", content: "一个可以将日常软件无缝切换，基于对话动态生成能力的操作系统。这会改变个人工作流的范式。" },
    { id: 2, title: "购物清单", content: "咖啡豆、燕麦奶、全麦面包" }
  ]);
  const [activeId, setActiveId] = useState<number | null>(null);

  const updateNote = (id: number, field: 'title' | 'content', value: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const activeNote = notes.find(n => n.id === activeId);

  return (
    <div className="flex flex-col h-full bg-[#111113] text-zinc-100 overflow-hidden relative font-sans">
      
      {/* List View */}
      <motion.div 
        initial={false}
        animate={{ x: activeId ? '-100%' : '0%', opacity: activeId ? 0 : 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 250 }}
        className="absolute inset-0 flex flex-col p-5 scroll-smooth"
      >
         <div className="flex items-center justify-between mb-5 mt-1">
           <h3 className="font-semibold text-lg flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-indigo-400" />
            快速笔记
           </h3>
           <button onClick={() => {
              const newNote = { id: Date.now(), title: "新建笔记", content: "" };
              setNotes([newNote, ...notes]);
              setActiveId(newNote.id);
           }} className="text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] p-2 rounded-full transition-colors shadow-sm">
             <Plus className="w-4 h-4" />
           </button>
         </div>
         <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar pb-2">
            {notes.map(note => (
              <motion.div 
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.96 }}
                key={note.id} 
                onClick={() => setActiveId(note.id)}
                className="bg-[#18181b] hover:bg-[#1a1a1e] border border-white/[0.05] hover:border-white/[0.1] p-5 rounded-[20px] cursor-pointer transition-colors shadow-sm group flex justify-between items-start"
              >
                <div className="flex-1 pr-4">
                  <div className="font-bold text-[15px] text-zinc-100 mb-2 leading-tight">{note.title}</div>
                  <div className="text-[13px] text-zinc-500 font-medium leading-relaxed line-clamp-2">{note.content}</div>
                </div>
                <div className="h-full flex items-center pt-3">
                  <ChevronRight className="w-[18px] h-[18px] text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
         </div>
      </motion.div>

      {/* Editor View */}
      <motion.div 
        initial={false}
        animate={{ x: activeId ? '0%' : '100%', opacity: activeId ? 1 : 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 250 }}
        className="absolute inset-0 flex flex-col bg-[#111113] z-10"
      >
        {activeNote && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-white/[0.05] bg-[#0a0a0a]/50">
               <button onClick={() => setActiveId(null)} className="flex items-center text-zinc-400 hover:text-white text-[13px] font-bold transition-colors bg-white/[0.05] hover:bg-white/[0.1] px-4 py-2 rounded-full">
                 <ChevronLeft className="w-[18px] h-[18px] mr-1" /> 返回列表
               </button>
               <button 
                 onClick={() => {
                   setNotes(notes.filter(n => n.id !== activeId));
                   setActiveId(null);
                 }} 
                 className="flex items-center text-red-400 hover:text-red-300 text-[12px] font-bold transition-colors bg-red-500/10 hover:bg-red-500/20 px-3.5 py-1.5 rounded-full"
               >
                 <Trash2 className="w-3.5 h-3.5 mr-1" /> 删除笔记
               </button>
            </div>
            <div className="flex-1 p-6 flex flex-col bg-[#111113]">
              <input 
                type="text" 
                value={activeNote.title} 
                onChange={(e) => updateNote(activeId!, 'title', e.target.value)}
                className="bg-transparent border-none outline-none text-2xl font-bold mb-4 text-zinc-100 px-1" 
                placeholder="标题"
              />
              <textarea 
                 value={activeNote.content}
                 onChange={(e) => updateNote(activeId!, 'content', e.target.value)}
                 className="flex-1 bg-transparent px-1 border-none outline-none resize-none text-[15px] leading-[1.8] text-zinc-400 font-medium placeholder-zinc-600 hide-scrollbar"
                 placeholder="开始输入..."
              />
            </div>
          </>
        )}
      </motion.div>

    </div>
  );
}
