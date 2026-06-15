import { useEffect, useState } from "react";
import { KeyRound, PlugZap, Save, Trash2 } from "lucide-react";
import { deleteAiProviderKey, listAiProviders, saveAiProviderKey, testAiProvider, updateActiveAiProvider, updateAiProviderModel } from "../../../services/lifeosApi";
import type { AiProviderId, AiProviderStatus, ConfigDiagnostics } from "../../../services/lifeosApi";

const providerDetails: Record<AiProviderId, string> = {
  gemini: "Google Gemini API Key",
  openai: "Responses / Chat Completions",
  openrouter: "多模型聚合路由",
  local: "Ollama / LM Studio endpoint",
};

export default function AiKeyPanel({ diagnostics, onChanged }: { diagnostics: ConfigDiagnostics; onChanged: () => Promise<void> }) {
  const [apiKey, setApiKey] = useState("");
  const [providers, setProviders] = useState<AiProviderStatus[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AiProviderId>("gemini");
  const [selectedModel, setSelectedModel] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const activeProvider = providers.find((provider) => provider.id === selectedProvider) || providers[0] || {
    id: "gemini" as const,
    provider: diagnostics.ai.provider,
    envVar: diagnostics.ai.envVar,
    source: diagnostics.ai.source,
    configured: diagnostics.ai.configured,
    enabled: true,
    models: diagnostics.ai.models || [],
    defaultModel: diagnostics.ai.defaultModel,
    selectedModel: diagnostics.ai.selectedModel,
    restartRequired: diagnostics.ai.restartRequired,
    secureStorage: diagnostics.ai.secureStorage,
    recommendations: diagnostics.ai.recommendations,
  };
  const envManaged = activeProvider.source === "environment";
  const localManaged = activeProvider.source === "encrypted_store" || activeProvider.source === "system_secure_store";
  const storageLabel = activeProvider.source === "system_secure_store"
    ? "系统安全存储"
    : activeProvider.source === "encrypted_store"
      ? "本地加密存储"
      : activeProvider.source === "environment"
        ? `${activeProvider.envVar} 环境变量`
        : "未配置";
  const modelOptions = activeProvider.models || [];
  const modelValue = selectedModel || activeProvider.selectedModel || activeProvider.defaultModel || modelOptions[0] || "";
  const secureStorage = activeProvider.secureStorage;
  const storageHealthLabel = secureStorage?.systemAvailable
    ? `${secureStorage.systemName || "系统安全存储"} 可用`
    : "系统安全存储不可用";
  const storageHealthTone = secureStorage?.migrationRecommended
    ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
    : secureStorage?.systemAvailable && !secureStorage?.fallbackActive
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : "border-white/[0.08] bg-white/[0.03] text-zinc-300";

  const refreshProviders = async () => {
    const data = await listAiProviders();
    setProviders(data.providers);
  };

  useEffect(() => {
    refreshProviders().catch((error) => setStatus(error.message || "加载 AI provider 失败"));
  }, []);

  useEffect(() => {
    setSelectedModel(activeProvider.selectedModel || activeProvider.defaultModel || activeProvider.models?.[0] || "");
  }, [activeProvider.id, activeProvider.selectedModel, activeProvider.defaultModel, activeProvider.models]);

  const handleSave = async () => {
    if (!apiKey.trim() || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      await saveAiProviderKey(selectedProvider, apiKey.trim());
      setApiKey("");
      setStatus(`${activeProvider.provider} 配置已安全保存。`);
      await refreshProviders();
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "保存失败");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy || !window.confirm(`确定删除本机保存的 ${activeProvider.provider} 配置？环境变量配置不会被删除。`)) return;
    setBusy(true);
    setStatus(null);
    try {
      await deleteAiProviderKey(selectedProvider);
      setStatus(`${activeProvider.provider} 配置已删除。`);
      await refreshProviders();
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "删除失败");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const result = await testAiProvider(selectedProvider);
      setStatus(result.message);
      await refreshProviders();
    } catch (error: any) {
      setStatus(error.message || "测试失败");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveModel = async () => {
    if (!modelValue.trim() || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await updateAiProviderModel(selectedProvider, modelValue.trim());
      setSelectedModel(result.provider.selectedModel || modelValue.trim());
      setStatus(`${result.provider.provider} 模型已保存：${result.provider.selectedModel || modelValue.trim()}`);
      await refreshProviders();
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "保存模型失败");
    } finally {
      setBusy(false);
    }
  };

  const handleSetDefaultProvider = async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await updateActiveAiProvider(selectedProvider);
      setProviders(result.providers);
      setStatus(`${result.provider.provider} 已设为默认聊天 Provider。`);
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "设置默认 Provider 失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold">
          <KeyRound className="h-4 w-4 text-cyan-300" />
          AI Key 安全配置
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-bold text-zinc-300">
          {activeProvider.provider} · {storageLabel}
        </span>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        {providers.map((provider) => {
          const active = selectedProvider === provider.id;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => setSelectedProvider(provider.id)}
              className={`rounded-2xl border p-3 text-left transition-colors ${active ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-zinc-100">{provider.provider}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${provider.configured ? "bg-emerald-500/10 text-emerald-200" : provider.enabled ? "bg-cyan-500/10 text-cyan-200" : "bg-white/[0.06] text-zinc-400"}`}>
                  {provider.active ? "默认" : provider.configured ? "已配置" : provider.enabled ? "可配置" : "预留"}
                </span>
              </div>
              <div className="mt-1 truncate text-[11px] text-zinc-500">{providerDetails[provider.id]}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">{activeProvider.provider} 配置</label>
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            type="password"
            disabled={envManaged || busy}
            placeholder={envManaged ? `当前由 ${activeProvider.envVar} 环境变量管理` : activeProvider.id === "local" ? "http://127.0.0.1:11434" : "输入 API Key"}
            className="w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-55"
          />
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Key 不会回显到前端。桌面版优先使用系统安全存储；不可用时自动降级为本地 AES-GCM 加密。
            {secureStorage ? ` 当前策略：${secureStorage.label}。` : ""}
            {!activeProvider.enabled ? " 该 provider 的聊天路由暂未启用，但可以先安全保存配置。" : ""}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleSave}
            disabled={envManaged || busy || apiKey.trim().length < 8}
            className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-[#061016] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "处理中..." : "保存"}
          </button>
          <button
            onClick={handleTest}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlugZap className="h-4 w-4" />
            测试
          </button>
          <button
            onClick={handleDelete}
            disabled={envManaged || busy || !localManaged}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            删除
          </button>
        </div>
      </div>

      {secureStorage ? (
        <div className={`mt-4 rounded-2xl border p-4 text-xs leading-relaxed ${storageHealthTone}`}>
          <div className="font-bold">{storageHealthLabel}</div>
          <div className="mt-1 opacity-80">当前保存位置：{secureStorage.current ? secureStorage.label : "尚未保存配置"}</div>
          <div className="mt-1 opacity-80">优先策略：{secureStorage.systemAvailable ? secureStorage.systemName || "系统安全存储" : secureStorage.fallbackLabel || "本地 AES-GCM 加密文件"}</div>
          {secureStorage.migrationRecommended ? (
            <div className="mt-2 font-semibold text-amber-100">这条配置仍在本地加密文件中。重新保存一次可迁移到系统安全存储。</div>
          ) : null}
          {!secureStorage.systemAvailable ? (
            <div className="mt-2 text-zinc-400">从桌面版启动时会优先使用 macOS Keychain/系统凭据；直接用浏览器或 Node 启动时会使用本地加密 fallback。</div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">{activeProvider.provider} 模型</label>
          {activeProvider.id === "local" ? (
            <>
              <input
                value={modelValue}
                onChange={(event) => setSelectedModel(event.target.value)}
                list="lifeos-local-ai-models"
                aria-label={`${activeProvider.provider} 模型`}
                disabled={busy}
                placeholder="llama3.1"
                className="w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-55"
              />
              <datalist id="lifeos-local-ai-models">
                {modelOptions.map((model) => <option key={model} value={model} />)}
              </datalist>
            </>
          ) : (
            <select
              value={modelValue}
              onChange={(event) => setSelectedModel(event.target.value)}
              aria-label={`${activeProvider.provider} 模型`}
              disabled={busy}
              className="w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm text-zinc-100 outline-none focus:border-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          )}
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            当前聊天路由会优先使用这里保存的模型；Studio 里显式选择的模型仍会作为兼容提示。
          </p>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleSaveModel}
            disabled={busy || !modelValue.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            保存模型
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs text-zinc-400">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-bold text-zinc-200">默认聊天 Provider</div>
            <div className="mt-1 leading-relaxed">
              当前默认：{providers.find((provider) => provider.active)?.provider || "Google Gemini"}。手机和电脑聊天会优先使用默认 Provider；Studio 里的旧模型名称仅作为兼容提示。
            </div>
          </div>
          <button
            onClick={handleSetDefaultProvider}
            disabled={busy || activeProvider.active}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            设为默认聊天 Provider
          </button>
        </div>
      </div>

      {status ? <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-zinc-300">{status}</div> : null}
    </section>
  );
}
