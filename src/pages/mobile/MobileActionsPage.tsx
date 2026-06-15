import { ArrowLeft, Command } from "lucide-react";
import SystemActionsApp from "../../components/apps/SystemActionsApp";

export default function MobileActionsPage() {
  return (
    <div className="min-h-screen bg-[#060a10] text-zinc-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[#060a10]/90 px-4 py-3 backdrop-blur-xl">
        <a href="/mobile/chat" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-300">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div className="flex items-center gap-2 text-sm font-bold">
          <Command className="w-4 h-4 text-cyan-300" />
          本地能力
        </div>
        <div className="h-10 w-10" />
      </header>

      <main className="mx-auto max-w-md p-4">
        <div className="mb-4 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
          <h1 className="text-base font-bold text-cyan-100">PWA 本地能力桥</h1>
          <p className="mt-1 text-xs leading-relaxed text-cyan-100/70">
            这里使用系统链接协议唤起手机本地应用。部分动作会由系统要求二次确认，这是手机系统的安全边界。
          </p>
        </div>
        <div className="h-[calc(100vh-150px)] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111113]">
          <SystemActionsApp />
        </div>
      </main>
    </div>
  );
}
