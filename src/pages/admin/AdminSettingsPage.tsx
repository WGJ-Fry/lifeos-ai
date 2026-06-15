import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, DatabaseBackup, Download, KeyRound, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { diagnosticBundleDownloadUrl, getConfigDiagnostics, getHealth, getPendingRestore, listAuditLogs, listBackups } from "../../services/lifeosApi";
import type { AuditLogRecord, ConfigDiagnostics, PendingRestore } from "../../services/lifeosApi";
import ConnectionGuide from "./ConnectionGuide";
import AuditLogPanel from "./settings/AuditLogPanel";
import BackupRestorePanel from "./settings/BackupRestorePanel";
import ConfigDiagnosticsPanel from "./settings/ConfigDiagnosticsPanel";
import StatusPanel from "./settings/StatusPanel";
import AiKeyPanel from "./settings/AiKeyPanel";
import AdminPasswordPanel from "./settings/AdminPasswordPanel";

type Health = Awaited<ReturnType<typeof getHealth>>;
type BackupItem = Awaited<ReturnType<typeof listBackups>>["backups"][number];

export default function AdminSettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<ConfigDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      const [healthData, backupData, pendingRestoreData, auditData, diagnosticsData] = await Promise.all([getHealth(), listBackups(), getPendingRestore(), listAuditLogs(), getConfigDiagnostics()]);
      setHealth(healthData);
      setBackups(backupData.backups);
      setPendingRestore(pendingRestoreData.pendingRestore);
      setLogs(auditData.logs);
      setDiagnostics(diagnosticsData);
    } catch (err: any) {
      setError(err.message || "加载设置失败");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="min-h-screen bg-[#060a10] p-6 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="/admin/dashboard" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-cyan-200">
              <ArrowLeft className="h-4 w-4" />
              返回控制台
            </a>
            <h1 className="text-2xl font-bold">系统设置</h1>
            <p className="mt-1 text-sm text-zinc-400">查看本地核心、安全模式、备份与审计状态。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={diagnosticBundleDownloadUrl()} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200">
              <Download className="h-4 w-4" />
              导出诊断包
            </a>
            <button onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-bold">
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
          </div>
        </header>

        {error ? <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <StatusPanel
            icon={<Server className="h-5 w-5" />}
            title="本地核心"
            tone="cyan"
            rows={[
              ["状态", health?.ok ? "Online" : "Unknown"],
              ["监听地址", health?.host || "-"],
              ["网络模式", health?.networkMode === "lan" ? "LAN" : "Local"],
            ]}
          />
          <StatusPanel
            icon={<ShieldCheck className="h-5 w-5" />}
            title="安全"
            tone={health?.publicAccessWarning ? "amber" : "green"}
            rows={[
              ["公网/LAN 暴露", health?.publicAccessWarning ? "已开启或已配置公网地址" : "未开启"],
              ["公网授权", health?.publicAccessAllowed ? "LIFEOS_ALLOW_PUBLIC=1" : "未授权"],
              ["PUBLIC_BASE_URL", health?.publicBaseUrl || "-"],
            ]}
          />
          <StatusPanel
            icon={<KeyRound className="h-5 w-5" />}
            title="AI"
            tone={health?.aiConfigured ? "green" : "amber"}
            rows={[
              ["AI Provider", health?.aiConfigured ? "至少一个已配置" : "未配置"],
              ["服务版本", health?.version || "-"],
              ["运行时长", health ? `${Math.round(health.uptime)} 秒` : "-"],
            ]}
          />
          <StatusPanel
            icon={<DatabaseBackup className="h-5 w-5" />}
            title="数据"
            tone="blue"
            rows={[
              ["备份数量", String(backups.length)],
              ["最新备份", backups[0]?.file || "-"],
              ["恢复任务", pendingRestore ? `等待重启：${pendingRestore.restoredFrom}` : "无"],
            ]}
          />
        </section>

        {diagnostics ? <ConfigDiagnosticsPanel diagnostics={diagnostics} /> : null}

        {diagnostics ? <AdminPasswordPanel diagnostics={diagnostics} onChanged={refresh} /> : null}

        {diagnostics ? <AiKeyPanel diagnostics={diagnostics} onChanged={refresh} /> : null}

        <ConnectionGuide health={health} />

        <BackupRestorePanel backups={backups} pendingRestore={pendingRestore} onChanged={refresh} />

        {health?.publicAccessWarning ? (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
              <div>
                <div className="font-bold">外部访问安全提示</div>
                <div className="mt-1 text-amber-100/75">公网或局域网模式应只放在可信隧道/反向代理之后。仅在受控代理后设置 LIFEOS_TRUST_PROXY=1。</div>
              </div>
            </div>
          </div>
        ) : null}

        <AuditLogPanel logs={logs} />
      </div>
    </div>
  );
}
