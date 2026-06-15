import { Code, Copy, Sparkles, Zap } from "lucide-react";

type StudioEditorHeaderProps = {
  appName: string;
  showRawEditor: boolean;
  onCopy: () => void;
  onToggleRawEditor: () => void;
  onCancel: () => void;
  onPublish: () => void;
};

export default function StudioEditorHeader({
  appName,
  showRawEditor,
  onCopy,
  onToggleRawEditor,
  onCancel,
  onPublish,
}: StudioEditorHeaderProps) {
  return (
    <div className="border-b border-white/[0.08] bg-[#111113]/80 px-6 py-4 flex items-center justify-between backdrop-blur-md shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h4 className="text-zinc-100 font-bold tracking-tight text-[16px]">
            {appName}
            <span className="text-indigo-400 font-medium ml-2 px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20 text-[10px] font-mono">
              DEBUG CHANNEL
            </span>
          </h4>
          <p className="text-[11px] text-zinc-550 font-semibold mt-0.5">极客源码沙箱 • 正在编辑并调试本地离线微程序</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-white/[0.03] text-zinc-400 border border-[#ffffff]/[0.08] hover:bg-[#ffffff]/[0.06] hover:text-white"
          title="复制当前微应用程序的完整包含 HTML/CSS/JS 的源代码"
        >
          <Copy className="w-4 h-4" />
          <span>复制源码 (Copy)</span>
        </button>

        <button
          onClick={onToggleRawEditor}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${showRawEditor ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/35 hover:bg-indigo-500/20" : "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:bg-white/[0.06] hover:text-white"}`}
          title={showRawEditor ? "隐藏代码编辑界面" : "展开高级代码调试界面"}
        >
          <Code className="w-4 h-4" />
          <span>{showRawEditor ? "隐藏源码 (No Code)" : "展开源码 (Show Code)"}</span>
        </button>

        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-colors text-zinc-455 hover:text-white hover:bg-white/[0.05]"
        >
          放弃更改
        </button>

        <button
          onClick={onPublish}
          className="bg-indigo-650 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] active:scale-95 flex items-center gap-1.5"
        >
          <Zap className="w-4 h-4" />
          <span>编译并部署发布 (Publish)</span>
        </button>
      </div>
    </div>
  );
}
