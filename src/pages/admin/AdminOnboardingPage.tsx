import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, DatabaseBackup, KeyRound, Loader2, ShieldAlert, Smartphone, Sparkles } from "lucide-react";
import { completeOnboarding, createBackup, getBackupSchedule, getConfigDiagnostics, getOnboardingStatus, listAiProviders, listBackups, listDevices, saveAiProviderKey, testAiProvider, updateActiveAiProvider, updateAiProviderModel, updateBackupSchedule } from "../../services/lifeosApi";
import type { AiProviderId, AiProviderStatus, BackupRecord, BackupSchedule, BoundDevice, ConfigDiagnostics, OnboardingStatus } from "../../services/lifeosApi";

const providerLabels: Record<AiProviderId, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  local: "本地模型",
};

export default function AdminOnboardingPage() {
  const [diagnostics, setDiagnostics] = useState<ConfigDiagnostics | null>(null);
  const [providers, setProviders] = useState<AiProviderStatus[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AiProviderId>("gemini");
  const [selectedModel, setSelectedModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backupSchedule, setBackupSchedule] = useState<BackupSchedule | null>(null);
  const [devices, setDevices] = useState<BoundDevice[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const activeProvider = useMemo(() => providers.find((provider) => provider.id === selectedProvider), [providers, selectedProvider]);
  const aiConfigured = providers.some((provider) => provider.configured);
  const latestBackup = backups[0];
  const hasBackup = backups.length > 0;
  const hasDevice = devices.some((device) => device.status !== "revoked");
  const completedSteps = [aiConfigured, hasBackup, hasDevice, onboarding?.steps.find((step) => step.id === "security")?.done].filter(Boolean).length;
  const securityItems = diagnostics?.securityCheck.items || [];
  const securityRiskCount = securityItems.filter((item) => item.status !== "ok").length;

  const refresh = async () => {
    const [providerData, diagnosticsData, backupData, scheduleData, deviceData, onboardingData] = await Promise.all([listAiProviders(), getConfigDiagnostics(), listBackups(), getBackupSchedule(), listDevices(), getOnboardingStatus()]);
    setProviders(providerData.providers);
    setDiagnostics(diagnosticsData);
    setBackups(backupData.backups);
    setBackupSchedule(scheduleData.schedule);
    setDevices(deviceData.devices);
    setOnboarding(onboardingData.onboarding);
  };

  useEffect(() => {
    refresh().catch((error) => setStatus(error.message || "加载初始化向导失败"));
  }, []);

  useEffect(() => {
    setSelectedModel(activeProvider?.selectedModel || activeProvider?.defaultModel || activeProvider?.models?.[0] || "");
  }, [activeProvider?.id, activeProvider?.selectedModel, activeProvider?.defaultModel, activeProvider?.models]);

  const handleSaveAiKey = async () => {
    if (!apiKey.trim()) {
      setStatus("请输入 AI Key 或本地模型端点。");
      return;
    }
    setBusy("ai");
    setStatus(null);
    try {
      if (selectedModel.trim()) {
        await updateAiProviderModel(selectedProvider, selectedModel.trim());
      }
      await saveAiProviderKey(selectedProvider, apiKey.trim());
      await updateActiveAiProvider(selectedProvider);
      const result = await testAiProvider(selectedProvider);
      setApiKey("");
      setStatus(`${result.message} 已设为默认聊天 Provider。`);
      await refresh();
    } catch (error: any) {
      setStatus(error.message || "AI 配置失败");
    } finally {
      setBusy(null);
    }
  };

  const handleSetDefaultProvider = async () => {
    setBusy("ai-default");
    setStatus(null);
    try {
      const result = await updateActiveAiProvider(selectedProvider);
      setStatus(`${result.provider.provider} 已设为默认聊天 Provider。`);
      await refresh();
    } catch (error: any) {
      setStatus(error.message || "设置默认 Provider 失败");
    } finally {
      setBusy(null);
    }
  };

  const handleCreateBackup = async () => {
    setBusy("backup");
    setStatus(null);
    try {
      const result = await createBackup();
      setStatus(`已创建初始备份：${result.backup.file}`);
      await refresh();
    } catch (error: any) {
      setStatus(error.message || "创建初始备份失败");
    } finally {
      setBusy(null);
    }
  };

  const handleEnableDailyBackup = async () => {
    setBusy("backup-schedule");
    setStatus(null);
    try {
      const result = await updateBackupSchedule({ enabled: true, intervalHours: 24 });
      setBackupSchedule(result.schedule);
      setStatus("已开启每日自动备份。之后 LifeOS AI 会定期创建 SQLite 快照。");
      await refresh();
    } catch (error: any) {
      setStatus(error.message || "开启自动备份失败");
    } finally {
      setBusy(null);
    }
  };

  const handleCompleteOnboarding = async () => {
    setBusy("complete");
    setStatus(null);
    try {
      const result = await completeOnboarding();
      setOnboarding(result.onboarding);
      setStatus("首次启动向导已完成。");
      window.location.href = result.onboarding.nextPath || "/admin/dashboard";
    } catch (error: any) {
      setStatus(error.message || "还有初始化步骤未完成。");
      await refresh().catch(() => null);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a10] p-5 text-zinc-100">
      <main className="mx-auto flex min-h-[calc(100vh-40px)] max-w-5xl flex-col justify-center">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            首次启动向导
          </div>
          <h1 className="text-3xl font-bold tracking-tight">把 LifeOS AI 配到可用状态</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            管理员密码已经设置完成。接下来配置 AI Key、创建初始备份，并绑定手机端。也可以先进入控制台，之后从系统设置继续完成。
          </p>
          <div className="mt-5 max-w-xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
              <span>初始化进度</span>
              <span>{completedSteps} / 4</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${(completedSteps / 4) * 100}%` }} />
            </div>
            {onboarding?.completed ? (
              <div className="mt-3 text-xs font-bold text-emerald-300">
                基础配置已完成{onboarding.completedAt ? `，完成时间：${new Date(onboarding.completedAt).toLocaleString()}` : ""}。
              </div>
            ) : (
              <div className="mt-3 text-xs text-zinc-500">完成 AI、备份、手机绑定和安全自检后，电脑端和手机端都会进入长期可用状态。</div>
            )}
          </div>
        </div>

        {status ? <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-zinc-300">{status}</div> : null}

        {diagnostics ? (
          <section className={`mb-5 rounded-[28px] border p-5 ${
            diagnostics.securityCheck.overall === "critical"
              ? "border-red-400/25 bg-red-500/10"
              : diagnostics.securityCheck.overall === "warning"
                ? "border-amber-400/25 bg-amber-500/10"
                : "border-emerald-400/20 bg-emerald-500/10"
          }`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#060a10]/60">
                  {securityRiskCount ? <ShieldAlert className="h-5 w-5 text-amber-200" /> : <CheckCircle2 className="h-5 w-5 text-emerald-200" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">启动安全自检</h2>
                    <span className="rounded-full border border-white/[0.08] bg-[#060a10]/50 px-2.5 py-1 text-[11px] font-bold text-zinc-200">
                      {securityRiskCount ? `${securityRiskCount} 项需要处理` : "全部通过"}
                    </span>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300/80">
                    开启公网或异地访问前，请先确认管理员密码、HTTPS/可信隧道、备份和 AI Key 状态。这里的检查不会暴露密钥或本地路径。
                  </p>
                </div>
              </div>
              <a href="/admin/settings" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-[#060a10]/55 px-4 py-3 text-sm font-bold text-zinc-100 hover:bg-white/[0.08]">
                <ShieldAlert className="h-4 w-4" />
                处理安全项
              </a>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {securityItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-[#060a10]/45 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-zinc-100">{item.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.status === "critical"
                        ? "bg-red-500/15 text-red-100"
                        : item.status === "warning"
                          ? "bg-amber-500/15 text-amber-100"
                          : "bg-emerald-500/15 text-emerald-100"
                    }`}>
                      {item.status === "critical" ? "风险" : item.status === "warning" ? "提示" : "OK"}
                    </span>
                  </div>
                  <div className="mt-2 leading-relaxed text-zinc-300">{item.message}</div>
                  <div className="mt-1 flex gap-2 leading-relaxed text-zinc-500">
                    {item.status !== "ok" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> : null}
                    <span>{item.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
            <StepHeader done={aiConfigured} icon={<KeyRound className="h-5 w-5" />} title="1. 配置 AI Key" />
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              推荐先配置 Gemini、OpenAI 或 OpenRouter。密钥只保存在电脑端安全/加密存储。
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`rounded-2xl border px-3 py-2 text-left text-xs font-bold ${selectedProvider === provider.id ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100" : "border-white/[0.06] bg-white/[0.03] text-zinc-300"}`}
                >
                  <span className="block truncate">{providerLabels[provider.id]}</span>
                  <span className={`mt-1 block text-[10px] ${provider.configured ? "text-emerald-300" : "text-zinc-500"}`}>
                    {provider.active ? "默认聊天" : provider.configured ? "已配置" : "待配置"}
                  </span>
                </button>
              ))}
            </div>
            {activeProvider ? (
              <>
                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs leading-relaxed text-zinc-400">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-zinc-200">默认聊天 Provider</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeProvider.active ? "bg-emerald-500/15 text-emerald-200" : "bg-white/[0.06] text-zinc-400"}`}>
                      {activeProvider.active ? "当前默认" : "未设为默认"}
                    </span>
                  </div>
                  <p className="mt-2">首次保存并测试会自动设为默认；环境变量已配置的 Provider 可直接设为默认。</p>
                </div>
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">{providerLabels[selectedProvider]} 模型</label>
                  {selectedProvider === "local" ? (
                    <>
                      <input
                        value={selectedModel}
                        onChange={(event) => setSelectedModel(event.target.value)}
                        list="lifeos-onboarding-local-models"
                        aria-label={`${providerLabels[selectedProvider]} 模型`}
                        disabled={busy === "ai"}
                        placeholder="llama3.1"
                        className="w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60 disabled:opacity-55"
                      />
                      <datalist id="lifeos-onboarding-local-models">
                        {(activeProvider.models || []).map((model) => <option key={model} value={model} />)}
                      </datalist>
                    </>
                  ) : (
                    <select
                      value={selectedModel}
                      onChange={(event) => setSelectedModel(event.target.value)}
                      aria-label={`${providerLabels[selectedProvider]} 模型`}
                      disabled={busy === "ai"}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60 disabled:opacity-55"
                    >
                      {(activeProvider.models || []).map((model) => <option key={model} value={model}>{model}</option>)}
                    </select>
                  )}
                </div>
              </>
            ) : null}
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              type="password"
              disabled={busy === "ai" || activeProvider?.source === "environment"}
              placeholder={activeProvider?.id === "local" ? "http://127.0.0.1:11434/v1" : activeProvider?.source === "environment" ? `${activeProvider.envVar} 环境变量已配置` : "输入 API Key"}
              className="mt-5 w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60 disabled:opacity-55"
            />
            <button
              onClick={handleSaveAiKey}
              disabled={busy === "ai" || activeProvider?.source === "environment"}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-[#061016] disabled:opacity-50"
            >
              {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              保存并测试
            </button>
            <button
              onClick={handleSetDefaultProvider}
              disabled={busy === "ai-default" || activeProvider?.active}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-bold text-zinc-200 disabled:opacity-50"
            >
              {busy === "ai-default" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {activeProvider?.active ? "已是默认聊天 Provider" : "设为默认聊天 Provider"}
            </button>
          </section>

          <section className="rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
            <StepHeader done={hasBackup} icon={<DatabaseBackup className="h-5 w-5" />} title="2. 创建初始备份" />
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              首次使用前先创建一个 SQLite 快照，之后升级、恢复和清理数据时有回退点。
            </p>
            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs leading-relaxed text-zinc-400">
              <div>数据目录：{diagnostics?.storage.dataDir || "-"}</div>
              <div>备份保留：最近 {diagnostics?.storage.backupRetentionCount || "20"} 份</div>
              <div>已有备份：{backups.length} 份</div>
              <div>
                自动备份：{backupSchedule?.enabled
                  ? `已开启，每 ${backupSchedule.intervalHours} 小时`
                  : "未开启"}
              </div>
              {backupSchedule?.nextRunAt ? <div>下次自动备份：{new Date(backupSchedule.nextRunAt).toLocaleString()}</div> : null}
              <div className="mt-2 truncate text-emerald-300">{latestBackup?.file || "尚未创建初始备份"}</div>
            </div>
            <div className="mt-5 grid gap-3">
              <button
                onClick={handleCreateBackup}
                disabled={busy === "backup"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 disabled:opacity-50"
              >
                {busy === "backup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
                创建备份
              </button>
              <button
                onClick={handleEnableDailyBackup}
                disabled={busy === "backup-schedule" || backupSchedule?.enabled}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200 disabled:opacity-50"
              >
                {busy === "backup-schedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
                {backupSchedule?.enabled ? "每日自动备份已开启" : "开启每日自动备份"}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
            <StepHeader done={hasDevice} icon={<Smartphone className="h-5 w-5" />} title="3. 绑定手机端" />
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              手机端是日常使用入口。进入绑定页后会生成二维码，手机扫码后会创建 WebCrypto 签名设备。
            </p>
            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs leading-relaxed text-zinc-400">
              <div>已绑定设备：{devices.filter((device) => device.status !== "revoked").length} 台</div>
              <div className="mt-2">{hasDevice ? "手机端已可作为日常入口使用。" : "建议先完成 AI Key 和备份，再绑定手机。"}</div>
              <div className="mt-2">如果手机和电脑不在同一局域网，先打开连接向导配置局域网、Cloudflare Tunnel 或 Tailscale。</div>
            </div>
            <div className="mt-5 grid gap-3">
              <a
                href="/admin/devices/pair"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200"
              >
                <Smartphone className="h-4 w-4" />
                打开手机绑定
              </a>
              <a
                href="/admin/settings#mobile-connect"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-bold text-zinc-200"
              >
                <ArrowRight className="h-4 w-4" />
                打开连接向导
              </a>
            </div>
          </section>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a href="/admin/settings" className="text-sm font-bold text-zinc-400 hover:text-cyan-200">
            进入系统设置继续配置
          </a>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleCompleteOnboarding}
              disabled={!onboarding?.completed || busy === "complete"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#061016] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              完成首次启动向导
            </button>
            <a href="/admin/dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-bold text-zinc-200">
              先进入控制台
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepHeader({ done, icon, title }: { done: boolean; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300">
          {icon}
        </div>
        <h2 className="font-bold">{title}</h2>
      </div>
      {done ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : null}
    </div>
  );
}
