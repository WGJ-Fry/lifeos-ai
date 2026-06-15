import { FolderSync, Globe, Lock, Play, Sparkles, Terminal, Trash2, Zap } from "lucide-react";
import { motion } from "motion/react";
import type { ChangeEvent, RefObject } from "react";
import { CustomApp } from "../../../types";

type StudioWorkshopTabProps = {
  customApps: CustomApp[];
  fileInputRef: RefObject<HTMLInputElement>;
  onClose: () => void;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenImportWizard: () => void;
  onOpenApp?: (id: string) => void;
  onDeleteApp?: (id: string) => void;
  onEditApp: (app: CustomApp) => void;
};

export default function StudioWorkshopTab({
  customApps,
  fileInputRef,
  onClose,
  onFileInputChange,
  onOpenImportWizard,
  onOpenApp,
  onDeleteApp,
  onEditApp,
}: StudioWorkshopTabProps) {
  return (
    <motion.div
      key="workshop"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 relative rounded-[32px] transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#0b0b0d] border border-white/[0.05] rounded-[24px] text-left relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400 animate-pulse" />
            微组件集成工坊 / Micro-Apps Workshop
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed mt-1 font-medium">
            打造并激活您的私人数据卡片。支持将任何现成的 HTML/JS、React/Vue 打包页、以及第三方仪表盘，以 Alpine.js 或 CDN 驱动样式一键注入沙盒容器。
          </p>
        </div>
        <button
          onClick={onOpenImportWizard}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-2xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.35)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center gap-2 active:scale-95 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-indigo-200" />
          让 AI 一键智能生成微应用
        </button>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="group border border-dashed border-zinc-800 hover:border-indigo-500/50 bg-[#0b0b0d]/80 hover:bg-zinc-950/45 p-8 rounded-[24px] transition-all duration-300 flex flex-col items-center text-center cursor-pointer relative overflow-hidden shadow-lg select-none"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileInputChange}
          className="hidden"
          accept="*"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] to-transparent pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-white/[0.02] group-hover:bg-indigo-500/10 border border-white/[0.05] group-hover:border-indigo-500/30 flex items-center justify-center mb-4 transition-all group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
          <FolderSync className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400 transition-colors animate-pulse" />
        </div>
        <h3 className="font-bold text-zinc-200 group-hover:text-white text-sm mb-1.5 transition-colors flex items-center gap-1.5 justify-center">
          AI 全模态拖入与多语言智能重构中心 / Universal Integrator
        </h3>
        <p className="text-zinc-500 group-hover:text-zinc-400 text-xs max-w-2xl leading-relaxed transition-colors font-medium">
          将任意 <span className="text-indigo-400 font-semibold">.tsx, .jsx, .vue, .html, .py, .java, .js, .json, .txt</span> 代码文件，甚至应用界面的<span className="text-emerald-400 font-semibold font-mono">『原型截图』</span>拖放到此区域。
          <br />
          AI 认知大脑将自动解析任意语言的逻辑/界面结构，重构出完美契合大屏容器的 Alpine.js + Tailwind 卡片并直接填妥集成属性。
        </p>
        <div className="mt-3.5 flex gap-2.5">
          <span className="text-[10px] bg-white/[0.02] group-hover:bg-white/[0.04] border border-white/[0.04] px-2.5 py-1 rounded-md text-zinc-500 group-hover:text-zinc-400 font-mono">SUPPORTED: .TSX, .VUE, .PY, .HTML, .JS, ALL LANGUAGES</span>
          <span className="text-[10px] bg-white/[0.02] group-hover:bg-white/[0.04] border border-white/[0.04] px-2.5 py-1 rounded-md text-zinc-400 group-hover:text-emerald-400 font-semibold font-mono">IMAGE / SCREENSHOT</span>
        </div>
      </div>

      {customApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 mt-4 bg-[#0b0b0d] rounded-[32px] border border-dashed border-white/[0.08] text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center mb-6 border border-white/[0.05]">
            <Terminal className="w-10 h-10 text-zinc-500" />
          </div>
          <h2 className="font-bold text-zinc-200 text-xl mb-3">您的专属工坊尚未添置工具</h2>
          <p className="text-zinc-500 font-medium text-xs mb-8 max-w-md leading-relaxed">
            您可以通过点击上方右上角的 **“集成/导入外部应用程序”** 按钮直接引入外部代码，或在对话终端中告诉私人管家，例如“写一个极简记账本”，它就会自动为您在此开发。
          </p>
          <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3.5 px-8 rounded-full shadow-lg transition-transform active:scale-95">
            返回对话终端去创建
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customApps.map((app) => (
            <div key={app.id} className="bg-[#0b0b0d] p-6 rounded-[24px] border border-white/[0.05] hover:border-indigo-500/40 hover:bg-[#0e0e11] transition-all duration-300 group shadow-lg flex flex-col h-[260px] text-left justify-between">
              <div className="flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-[15px] font-bold text-zinc-100 flex items-center gap-2.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    {app.name}
                    {app.status === "building" && (
                      <span className="text-[9px] font-semibold tracking-wide bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center shrink-0">
                        <Sparkles className="w-2.5 h-2.5 mr-1 animate-spin" /> 智算构建中
                      </span>
                    )}
                  </h3>
                  {app.status === "active" && (
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onOpenApp && (
                        <button onClick={() => onOpenApp(app.id)} className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/25" title="自适应运行">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteApp && (
                        <button onClick={() => onDeleteApp(app.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/15" title="清退组件">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[13px] text-zinc-400 leading-relaxed font-semibold mb-auto line-clamp-3">
                  {app.description}
                </p>
              </div>

              {app.status === "active" && (
                <div className="mt-4 pt-4 border-t border-white/[0.05] flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={app.visibility === "public" ? "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400" : "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-white/[0.03] text-zinc-500 border border-white/[0.05]"}>
                      {app.visibility === "public" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {app.visibility === "public" ? "Public" : "Private"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono bg-[#111115] px-2 py-0.5 rounded border border-white/[0.05]">
                      智能沙盒就绪
                    </span>
                  </div>
                  <button
                    onClick={() => onEditApp(app)}
                    className="text-xs font-bold text-white bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/30 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-inner"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI 协同改写
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
