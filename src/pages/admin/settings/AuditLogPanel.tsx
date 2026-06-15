import { ScrollText } from "lucide-react";
import type { AuditLogRecord } from "../../../services/lifeosApi";

export default function AuditLogPanel({ logs }: { logs: AuditLogRecord[] }) {
  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-[#101722]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-4 font-bold">
        <ScrollText className="h-4 w-4 text-cyan-300" />
        最近审计日志
      </div>
      {logs.length === 0 ? (
        <div className="p-6 text-sm text-zinc-400">暂无审计日志。</div>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {logs.slice(0, 12).map((log) => (
            <div key={log.id} className="grid gap-2 px-5 py-3 text-xs text-zinc-400 sm:grid-cols-[160px_1fr_150px]">
              <div>{new Date(log.createdAt).toLocaleString()}</div>
              <div className="font-mono text-zinc-200">{log.action}</div>
              <div className="truncate text-zinc-500">{log.targetType || "-"} {log.targetId || ""}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
