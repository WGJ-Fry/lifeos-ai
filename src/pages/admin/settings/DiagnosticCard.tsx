export default function DiagnosticCard({
  title,
  status,
  rows,
  recommendations,
  tone,
}: {
  title: string;
  status: string;
  rows: Array<[string, string]>;
  recommendations: string[];
  tone: "green" | "amber" | "blue";
}) {
  const toneClass = {
    green: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-200",
  }[tone];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="font-bold">{title}</div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${toneClass}`}>{status}</span>
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500">{label}</span>
            <span className="max-w-[60%] truncate text-right font-mono text-zinc-200">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3">
        {recommendations.map((recommendation) => (
          <div key={recommendation} className="text-xs leading-relaxed text-zinc-400">
            {recommendation}
          </div>
        ))}
      </div>
    </div>
  );
}
