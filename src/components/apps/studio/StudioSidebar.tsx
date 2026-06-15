import { Brain, Globe, LayoutDashboard, LockKeyhole, Settings, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { CustomApp } from "../../../types";

export type StudioTab = "overview" | "workshop" | "memory" | "byok" | "proxy" | "settings";

export default function StudioSidebar({
  activeTab,
  customApps,
  onSelectTab,
}: {
  activeTab: StudioTab;
  customApps: CustomApp[];
  onSelectTab: (tab: StudioTab) => void;
}) {
  return (
    <div className="relative z-20 hidden w-[200px] flex-col gap-2 border-r border-white/[0.05] bg-[#050505]/50 p-5 backdrop-blur-md md:flex lg:w-[250px]">
      <div className="mb-4 flex flex-col items-center border-b border-white/[0.05] py-6">
        <div className="mb-3 h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-black">
            <div className="h-full w-full bg-[url('https://i.pravatar.cc/150?u=a042581f4e29026024d')] bg-cover bg-center" />
          </div>
        </div>
        <div className="text-base font-bold text-white">郭健 / 主人翁</div>
        <div className="mt-1 flex items-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Identity Verified
        </div>
      </div>

      <div className="mb-1 mt-2 pl-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">数据枢纽板块</div>

      <SidebarButton
        active={activeTab === "overview"}
        icon={<LayoutDashboard className={`h-4 w-4 ${activeTab === "overview" ? "text-indigo-400" : ""}`} />}
        label="宏观监控面板"
        onClick={() => onSelectTab("overview")}
      />
      <SidebarButton
        active={activeTab === "workshop"}
        icon={<Zap className={`h-4 w-4 ${activeTab === "workshop" ? "text-amber-400" : ""}`} />}
        label="能力工坊"
        badge={String(customApps.length)}
        onClick={() => onSelectTab("workshop")}
      />
      <SidebarButton
        active={activeTab === "memory"}
        icon={<Brain className={`h-4 w-4 ${activeTab === "memory" ? "text-emerald-400" : ""}`} />}
        label="个人知识库"
        onClick={() => onSelectTab("memory")}
      />

      <div className="mb-1 mt-6 pl-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">内核与连接</div>

      <SidebarButton
        active={activeTab === "byok"}
        icon={<LockKeyhole className={`h-4 w-4 ${activeTab === "byok" ? "text-indigo-400" : ""}`} />}
        label="大模型枢纽 (BYOK)"
        onClick={() => onSelectTab("byok")}
      />
      <SidebarButton
        active={activeTab === "proxy"}
        icon={<Globe className={`h-4 w-4 ${activeTab === "proxy" ? "text-indigo-400" : ""}`} />}
        label="网络代理直连"
        onClick={() => onSelectTab("proxy")}
      />

      <div className="flex-1" />

      <SidebarButton
        active={activeTab === "settings"}
        icon={<Settings className={`h-4 w-4 ${activeTab === "settings" ? "text-indigo-400" : ""}`} />}
        label="系统自适应常驻设置"
        onClick={() => onSelectTab("settings")}
      />
    </div>
  );
}

function SidebarButton({
  active,
  badge,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  badge?: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all ${
        active ? "bg-white/[0.08] text-white shadow-lg" : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
      }`}
    >
      {icon}
      {label}
      {badge ? <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white">{badge}</span> : null}
    </button>
  );
}
