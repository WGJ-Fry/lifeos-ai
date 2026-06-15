import type { ReactNode } from "react";

export default function StatusPanel({ icon, title, rows, tone }: { icon: ReactNode; title: string; rows: Array<[string, string]>; tone: "cyan" | "green" | "amber" | "blue" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
    green: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-300",
  }[tone];

  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${toneClass}`}>{icon}</div>
        <div className="font-bold">{title}</div>
      </div>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-zinc-500">{label}</span>
            <span className="max-w-[65%] truncate text-right font-bold text-zinc-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
