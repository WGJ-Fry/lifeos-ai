import { KeyRound, ShieldAlert } from "lucide-react";
import type { ConfigDiagnostics } from "../../../services/lifeosApi";
import DiagnosticCard from "./DiagnosticCard";

function formatAiSource(diagnostics: ConfigDiagnostics) {
  if (diagnostics.ai.source === "system_secure_store") return "系统安全存储";
  if (diagnostics.ai.source === "encrypted_store") return "本地加密存储";
  if (diagnostics.ai.source === "environment") return diagnostics.ai.envVar;
  return "未配置";
}

export default function ConfigDiagnosticsPanel({ diagnostics }: { diagnostics: ConfigDiagnostics }) {
  const latestArtifact = diagnostics.release.artifacts[0];
  const releaseReady = diagnostics.release.manifestAvailable && diagnostics.release.checksumAvailable && diagnostics.release.artifactCount > 0;
  return (
    <section className="mb-6 rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
      <div className="mb-4 flex items-center gap-2 font-bold">
        <KeyRound className="h-4 w-4 text-cyan-300" />
        配置诊断
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DiagnosticCard
          title="AI 服务"
          status={diagnostics.ai.configured ? "已配置" : "需要配置"}
          tone={diagnostics.ai.configured ? "green" : "amber"}
          rows={[
            ["提供商", diagnostics.ai.provider],
            ["来源", formatAiSource(diagnostics)],
            ["安全存储", diagnostics.ai.secureStorage?.label || "-"],
            ["环境变量", diagnostics.ai.envVar],
            ["重启生效", diagnostics.ai.restartRequired ? "需要" : "不需要"],
          ]}
          recommendations={diagnostics.ai.recommendations}
        />
        <DiagnosticCard
          title="网络访问"
          status={diagnostics.network.publicAccessWarning ? "外部访问" : "本机访问"}
          tone={diagnostics.network.publicAccessWarning ? "amber" : "green"}
          rows={[
            ["监听地址", diagnostics.network.host || "-"],
            ["公网地址", diagnostics.network.publicBaseUrl || "-"],
            ["显式授权", diagnostics.network.publicAccessAllowed ? "已授权" : "未授权"],
          ]}
          recommendations={diagnostics.network.recommendations}
        />
        <DiagnosticCard
          title="数据存储"
          status="SQLite"
          tone="blue"
          rows={[
            ["数据目录", diagnostics.storage.dataDir],
            ["备份保留", diagnostics.storage.backupRetentionCount],
            ["自动备份", diagnostics.storage.backupSchedule.enabled ? `每 ${diagnostics.storage.backupSchedule.intervalHours} 小时` : "未开启"],
            ["下次备份", diagnostics.storage.backupSchedule.nextRunAt ? new Date(diagnostics.storage.backupSchedule.nextRunAt).toLocaleString() : "-"],
          ]}
          recommendations={diagnostics.storage.recommendations}
        />
        <DiagnosticCard
          title="发布包"
          status={releaseReady ? "可核验" : "待生成"}
          tone={releaseReady ? "green" : "amber"}
          rows={[
            ["版本", diagnostics.release.version || "-"],
            ["Manifest", diagnostics.release.manifestAvailable ? "存在" : "缺失"],
            ["SHA256SUMS", diagnostics.release.checksumAvailable ? "存在" : "缺失"],
            ["产物数", String(diagnostics.release.artifactCount)],
            ["最新产物", latestArtifact?.fileName || "-"],
          ]}
          recommendations={diagnostics.release.recommendations}
        />
      </div>
      <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <ShieldAlert className="h-4 w-4 text-amber-300" />
            公网安全自检
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            diagnostics.securityCheck.overall === "critical"
              ? "bg-red-500/10 text-red-200"
              : diagnostics.securityCheck.overall === "warning"
                ? "bg-amber-500/10 text-amber-200"
                : "bg-emerald-500/10 text-emerald-200"
          }`}>
            {diagnostics.securityCheck.overall === "critical" ? "需要处理" : diagnostics.securityCheck.overall === "warning" ? "建议检查" : "通过"}
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {diagnostics.securityCheck.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/[0.06] bg-[#060a10] p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-200">{item.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  item.status === "critical"
                    ? "bg-red-500/10 text-red-200"
                    : item.status === "warning"
                      ? "bg-amber-500/10 text-amber-200"
                      : "bg-emerald-500/10 text-emerald-200"
                }`}>
                  {item.status === "critical" ? "风险" : item.status === "warning" ? "提示" : "OK"}
                </span>
              </div>
              <div className="mt-2 text-zinc-400">{item.message}</div>
              <div className="mt-1 text-zinc-500">{item.action}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
