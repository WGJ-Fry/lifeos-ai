import { Sparkles } from "lucide-react";

export default function StudioShellHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="z-10 flex items-center justify-between border-b border-white/[0.05] bg-[#050505]/40 p-6 backdrop-blur-md">
      <div className="text-left">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          JARVIS 智能工坊集成主控台
        </h1>
        <p className="mt-0.5 text-xs font-medium text-zinc-500">离线数据安全、轻型微应用、智能中转与习惯偏好枢纽</p>
      </div>
      <button
        onClick={onClose}
        className="rounded-xl bg-white/[0.05] px-5 py-2 text-xs font-bold text-zinc-300 transition-all hover:bg-white/[0.1] active:scale-95"
      >
        返回数字桌面
      </button>
    </div>
  );
}
