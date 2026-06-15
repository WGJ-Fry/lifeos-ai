import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, Brain, DatabaseBackup, Download, Eye, KeyRound, LogOut, MessageSquareText, Plus, RefreshCw, Server, Settings, Smartphone, Wifi } from "lucide-react";
import { BoundDevice, ChatSession, MemoryRecord, backupDownloadUrl, createBackup, getHealth, listBackups, listChatSessions, listDevices, listMemories, logoutAdmin, previewBackup, requestDeviceTokenRotation, restoreBackup, revokeDevice } from "../../services/lifeosApi";
import type { BackupPreview } from "../../services/lifeosApi";
import { buildRestoreConfirmMessage } from "../../services/backupRestoreUi";

type Health = Awaited<ReturnType<typeof getHealth>>;
type BackupItem = Awaited<ReturnType<typeof listBackups>>["backups"][number];

export default function AdminDashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [devices, setDevices] = useState<BoundDevice[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [busyBackupFile, setBusyBackupFile] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      const [healthData, deviceData, sessionData, memoryData, backupData] = await Promise.all([getHealth(), listDevices(), listChatSessions(), listMemories(), listBackups()]);
      setHealth(healthData);
      setDevices(deviceData.devices);
      setSessions(sessionData.sessions);
      setMemories(memoryData.memories);
      setBackups(backupData.backups);
    } catch (err: any) {
      setError(err.message || "加载控制台状态失败");
    }
  };

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const loadBackupPreview = async (backup: BackupItem) => {
    setBusyBackupFile(`preview-${backup.file}`);
    setError(null);
    try {
      const result = await previewBackup(backup.file);
      setBackupPreview(result.preview);
      return result.preview;
    } catch (err: any) {
      setError(err.message || "读取备份预览失败");
      return null;
    } finally {
      setBusyBackupFile(null);
    }
  };

  const restoreWithPreview = async (backup: BackupItem) => {
    const preview = await loadBackupPreview(backup);
    if (!preview) return;
    const confirmed = window.confirm(buildRestoreConfirmMessage(backup.file, preview));
    if (!confirmed) return;
    setBusyBackupFile(`restore-${backup.file}`);
    try {
      const result = await restoreBackup(backup.file);
      window.alert(`已安排下次启动恢复。\n恢复前备份：${result.restore.preRestoreBackup.file}\n请重启 LifeOS AI 让恢复生效。`);
      await refresh();
    } catch (err: any) {
      setError(err.message || "安排恢复失败");
    } finally {
      setBusyBackupFile(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a10] text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">LifeOS Local Core</h1>
            <p className="text-sm text-zinc-400 mt-1">电脑端 AI 基站控制台</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin/chat" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-bold hover:bg-white/[0.06]">
              <MessageSquareText className="w-4 h-4" />
              会话历史
            </a>
            <a href="/admin/memory" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-bold hover:bg-white/[0.06]">
              <Brain className="w-4 h-4" />
              记忆
            </a>
            <a href="/admin/settings" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-bold hover:bg-white/[0.06]">
              <Settings className="w-4 h-4" />
              设置
            </a>
            <button onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-bold">
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
            <button
              onClick={async () => {
                await logoutAdmin();
                window.location.href = "/admin/login";
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-bold"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
            <a href="/admin/devices/pair" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-[#061016]">
              <Plus className="w-4 h-4" />
              绑定手机
            </a>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
            {error.includes("authentication") || error.includes("Authentication") ? (
              <a href="/admin/login" className="ml-3 font-bold text-cyan-200 underline">
                去登录
              </a>
            ) : null}
          </div>
        )}

        {health?.publicAccessWarning && (
          <div className={`mb-6 rounded-2xl border p-4 text-sm ${health.publicSetupRisk ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-amber-400/20 bg-amber-500/10 text-amber-100"}`}>
            <div className="flex gap-3">
              <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${health.publicSetupRisk ? "text-red-300" : "text-amber-300"}`} />
              <div className="min-w-0 flex-1">
                <div className="font-bold">{health.publicSetupRisk ? "公网/异地访问存在待处理风险" : "当前服务可能被局域网或公网访问"}</div>
                <div className={`mt-1 ${health.publicSetupRisk ? "text-red-100/75" : "text-amber-100/75"}`}>
                  LIFEOS_HOST={health.host || "-"}{health.publicBaseUrl ? `，PUBLIC_BASE_URL=${health.publicBaseUrl}` : ""}。{health.publicSetupRisk ? "请先处理下面的安全自检项，再长期开放给手机异地访问。" : "安全自检已通过，仍建议只通过可信隧道暴露服务。"}
                </div>
                {health.publicRisk?.items?.length ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {health.publicRisk.items.map((item) => (
                      <div key={item.id} className="rounded-xl border border-white/[0.08] bg-black/15 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-bold text-zinc-100">{item.label}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.status === "critical" ? "bg-red-500/15 text-red-100" : "bg-amber-500/15 text-amber-100"}`}>
                            {item.status === "critical" ? "必须处理" : "建议处理"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs leading-relaxed text-zinc-300">{item.message}</div>
                        <div className="mt-1 text-xs leading-relaxed text-zinc-500">{item.action}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href="/admin/settings" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-100">
                    <Settings className="h-3.5 w-3.5" />
                    打开安全设置
                  </a>
                  <a href="/admin/settings#backup-schedule" className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100">
                    <DatabaseBackup className="h-3.5 w-3.5" />
                    开启自动备份
                  </a>
                  <button
                    onClick={async () => {
                      await createBackup();
                      await refresh();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100"
                  >
                    <DatabaseBackup className="h-3.5 w-3.5" />
                    立即创建备份
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="grid md:grid-cols-4 gap-4 mb-6">
          <Metric icon={<Server className="w-5 h-5" />} label="服务状态" value={health?.ok ? "Online" : "Unknown"} tone="cyan" />
          <Metric icon={<Smartphone className="w-5 h-5" />} label="已绑定设备" value={String(health?.deviceCount ?? "-")} tone="blue" />
          <Metric icon={<Wifi className="w-5 h-5" />} label="在线设备" value={String(health?.onlineDeviceCount ?? "-")} tone="green" />
          <Metric icon={<MessageSquareText className="w-5 h-5" />} label="网络模式" value={health?.networkMode === "lan" ? "LAN" : "Local"} tone={health?.networkMode === "lan" ? "amber" : "cyan"} />
        </section>

        <section className="grid md:grid-cols-3 gap-4 mb-6">
          <a href="/admin/chat" className="rounded-3xl border border-white/[0.08] bg-[#101722] p-5 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 flex items-center justify-center">
                <MessageSquareText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold">查看长期会话</div>
                <div className="text-sm text-zinc-500 mt-1">浏览 SQLite 中保存的手机端与电脑端聊天记录。</div>
              </div>
            </div>
          </a>
          <a href="/admin/memory" className="rounded-3xl border border-white/[0.08] bg-[#101722] p-5 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold">管理长期记忆</div>
                <div className="text-sm text-zinc-500 mt-1">{memories.length} 条记忆会优先进入聊天上下文。</div>
              </div>
            </div>
          </a>
          <div className="rounded-3xl border border-white/[0.08] bg-[#101722] p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${health?.aiConfigured ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-amber-400/20 bg-amber-500/10 text-amber-300"}`}>
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold">AI Key {health?.aiConfigured ? "已配置" : "未配置"}</div>
                <div className="text-sm text-zinc-500 mt-1">未配置时，设备绑定和历史记录可用，AI 回复会失败。</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/[0.08] bg-[#101722] overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="font-bold flex items-center gap-2">
              <DatabaseBackup className="w-4 h-4 text-emerald-300" />
              数据库备份
            </div>
            <button
              onClick={async () => {
                await createBackup();
                await refresh();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200"
            >
              <Plus className="w-3.5 h-3.5" />
              创建备份
            </button>
          </div>
          {backups.length === 0 ? (
            <div className="p-6 text-sm text-zinc-400">还没有备份。建议在升级、恢复或长期外网使用前创建一次备份。</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {backups.slice(0, 5).map((backup) => (
                <div key={backup.file} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-zinc-200 truncate">{backup.file}</div>
                    <div className="text-xs text-zinc-500 mt-1">{new Date(backup.createdAt).toLocaleString()} · {(backup.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href={backupDownloadUrl(backup.file)} className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200">
                      <Download className="h-3.5 w-3.5" />
                      下载
                    </a>
                    <button
                      onClick={() => loadBackupPreview(backup)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-zinc-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {busyBackupFile === `preview-${backup.file}` ? "读取中" : "预览"}
                    </button>
                    <button
                      onClick={() => restoreWithPreview(backup)}
                      className="text-xs font-bold text-amber-300 hover:text-amber-200"
                    >
                      {busyBackupFile === `restore-${backup.file}` ? "安排中" : "恢复"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {backupPreview ? (
            <div className="border-t border-white/[0.06] bg-[#0b111a] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-bold text-zinc-100">恢复前预览：{backupPreview.backup.file}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    大小：{(backupPreview.backup.size / 1024).toFixed(1)} KB · 创建时间：{backupPreview.backup.createdAt ? new Date(backupPreview.backup.createdAt).toLocaleString() : "未知"}
                  </div>
                </div>
                <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-bold text-zinc-300">
                  {backupPreview.migrations.length} 个 migration
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(backupPreview.tables).map(([table, count]) => (
                  <div key={table} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="font-mono text-[11px] text-zinc-400">{table}</div>
                    <div className="mt-1 text-lg font-bold text-zinc-100">{count ?? "-"}</div>
                  </div>
                ))}
              </div>
              {backupPreview.sensitiveData ? (
                <div className={`mt-3 rounded-2xl border p-3 text-xs leading-relaxed ${backupPreview.sensitiveData.ordinaryBackupExcludesSecrets ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-red-400/20 bg-red-500/10 text-red-100"}`}>
                  <div className="font-bold">{backupPreview.sensitiveData.ordinaryBackupExcludesSecrets ? "普通备份已排除敏感密钥" : "备份仍包含敏感数据"}</div>
                  <div className="mt-1">
                    AI Key 记录：{backupPreview.sensitiveData.appSecretsRows}，敏感客户端状态：{backupPreview.sensitiveData.sensitiveClientStateRows}。
                    {backupPreview.sensitiveData.ordinaryBackupExcludesSecrets ? "恢复后需要在设置里重新配置 AI Key。" : "请改用加密备份或重新创建安全备份。"}
                  </div>
                </div>
              ) : null}
              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
                <div className="font-bold">恢复风险说明</div>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {backupPreview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-white/[0.08] bg-[#101722] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-300" />
              已绑定设备
            </div>
            <div className="text-xs text-zinc-500">每 5 秒自动刷新</div>
          </div>

          {devices.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-400">
              还没有绑定手机。点击右上角“绑定手机”生成二维码。
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {devices.map((device) => (
                <div key={device.id} className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{device.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {device.type} · 最后在线 {new Date(device.lastSeenAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold rounded-full px-2.5 py-1 border ${device.status === "online" ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-300" : "bg-white/[0.03] border-white/[0.08] text-zinc-400"}`}>
                      {device.status === "online" ? "在线" : "离线"}
                    </span>
                    <button
                      disabled={busyDeviceId === device.id}
                      onClick={async () => {
                        setBusyDeviceId(device.id);
                        try {
                          const result = await requestDeviceTokenRotation(device.id);
                          if (!result.delivered) {
                            window.alert("这台设备当前不在线，刷新凭证请求未送达。可以等设备上线后再试，或直接撤销后重新绑定。");
                          }
                        } finally {
                          setBusyDeviceId(null);
                          await refresh();
                        }
                      }}
                      className="text-xs font-bold text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
                    >
                      刷新凭证
                    </button>
                    <button
                      onClick={async () => {
                        await revokeDevice(device.id);
                        await refresh();
                      }}
                      className="text-xs font-bold text-red-300 hover:text-red-200"
                    >
                      撤销
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "cyan" | "blue" | "green" | "amber" }) {
  const toneClass = {
    cyan: "text-cyan-300 bg-cyan-500/10 border-cyan-400/20",
    blue: "text-blue-300 bg-blue-500/10 border-blue-400/20",
    green: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-400/20",
  }[tone];

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#101722] p-5">
      <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center mb-4 ${toneClass}`}>{icon}</div>
      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}
