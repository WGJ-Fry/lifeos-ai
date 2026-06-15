import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Download, KeyRound, Link2, LogOut, RefreshCw, ShieldCheck, Smartphone, Trash2, Wifi } from "lucide-react";
import { clearStoredDeviceCredential, getStoredDeviceCredential, getStoredDeviceCredentialAsync, getStoredDeviceCredentialStorageStatus, revokeCurrentDeviceBinding, rotateDeviceToken } from "../../services/lifeosApi";
import type { DeviceCredentialStorageStatus } from "../../services/lifeosApi";
import { clearOfflineMessageQueue, getOfflineMessageQueue, getOfflineMessageQueueStorageStatus, getOfflineMessageQueueSummary, removeOfflineMessages, resetFailedOfflineMessages, retryOfflineMessage, subscribeOfflineMessageQueue } from "../../services/offlineMessageQueue";
import type { OfflineMessageQueueStorageStatus, OfflineQueuedMessage } from "../../services/offlineMessageQueue";
import { getNetworkStatus } from "../../services/networkStatus";
import { extractPairingToken, pairingInstallPath } from "../../services/mobilePairingIntent";
import { getPwaCapabilityStatus } from "../../services/pwaCapabilities";
import { QueueItem, QueueStorageCard } from "./MobileOfflineQueueCards";

export default function MobileDevicePage() {
  const [credential, setCredential] = useState(() => getStoredDeviceCredential());
  const [status, setStatus] = useState<string | null>(null);
  const [pairingInput, setPairingInput] = useState("");
  const [pairingInputError, setPairingInputError] = useState<string | null>(null);
  const [queueSummary, setQueueSummary] = useState(() => getOfflineMessageQueueSummary());
  const [queueItems, setQueueItems] = useState<OfflineQueuedMessage[]>(() => getOfflineMessageQueue());
  const [network, setNetwork] = useState(() => getNetworkStatus());
  const [pwaCapabilities, setPwaCapabilities] = useState(() => getPwaCapabilityStatus());
  const [credentialStorage, setCredentialStorage] = useState<DeviceCredentialStorageStatus | null>(null);
  const [queueStorage, setQueueStorage] = useState<OfflineMessageQueueStorageStatus | null>(null);
  const expiresAt = useMemo(() => credential?.accessTokenExpiresAt ? new Date(credential.accessTokenExpiresAt).toLocaleString() : "签名设备长期有效", [credential]);

  const refreshCredentialStorage = async () => {
    const storage = await getStoredDeviceCredentialStorageStatus().catch(() => null);
    setCredentialStorage(storage);
  };

  useEffect(() => {
    let cancelled = false;
    getStoredDeviceCredentialAsync().then((next) => {
      if (!cancelled) setCredential(next);
      return refreshCredentialStorage();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refreshNetwork = () => {
      setNetwork(getNetworkStatus());
      setPwaCapabilities(getPwaCapabilityStatus());
    };
    window.addEventListener("online", refreshNetwork);
    window.addEventListener("offline", refreshNetwork);
    navigator.serviceWorker?.addEventListener?.("controllerchange", refreshNetwork);
    const connection = (navigator as any).connection;
    connection?.addEventListener?.("change", refreshNetwork);
    return () => {
      window.removeEventListener("online", refreshNetwork);
      window.removeEventListener("offline", refreshNetwork);
      navigator.serviceWorker?.removeEventListener?.("controllerchange", refreshNetwork);
      connection?.removeEventListener?.("change", refreshNetwork);
    };
  }, []);

  const refreshQueue = () => {
    setQueueSummary(getOfflineMessageQueueSummary());
    setQueueItems(getOfflineMessageQueue());
    void getOfflineMessageQueueStorageStatus().then(setQueueStorage).catch(() => null);
  };

  useEffect(() => {
    refreshQueue();
    return subscribeOfflineMessageQueue(() => refreshQueue());
  }, []);

  const handleForget = async () => {
    if (!window.confirm("解除这台手机绑定？系统会先尝试撤销电脑端设备记录，然后清除本机凭证。")) return;
    setStatus("正在解除绑定...");
    try {
      await revokeCurrentDeviceBinding();
      await clearStoredDeviceCredential();
      setCredential(null);
      await refreshCredentialStorage();
      setStatus("已解除绑定，并撤销电脑端设备记录。");
    } catch (error: any) {
      await clearStoredDeviceCredential();
      setCredential(null);
      await refreshCredentialStorage();
      setStatus(`已清除本机凭证；电脑端撤销失败：${error.message || "请稍后在电脑管理端撤销"}`);
    }
  };

  const handleRotate = async () => {
    setStatus("正在刷新凭证...");
    try {
      const next = await rotateDeviceToken();
      setCredential(next);
      await refreshCredentialStorage();
      setStatus("凭证状态已刷新。");
    } catch (error: any) {
      setStatus(error.message || "刷新失败，请重新绑定。");
    }
  };

  const handleRetryQueue = () => {
    resetFailedOfflineMessages();
    refreshQueue();
    setStatus("失败消息已改为待同步。打开聊天页后会自动重试。");
  };

  const handleRetryItem = (item: OfflineQueuedMessage) => {
    retryOfflineMessage(item.id);
    refreshQueue();
    setStatus("这条离线消息已改为待同步。打开聊天页后会自动重试。");
  };

  const handleRemoveItem = (item: OfflineQueuedMessage) => {
    if (!window.confirm("删除这条离线消息？删除后不会再补写到电脑端。")) return;
    removeOfflineMessages([item.id]);
    refreshQueue();
    setStatus("已删除这条离线消息。");
  };

  const handleClearQueue = () => {
    if (!window.confirm("清空这台手机上的离线消息队列？未同步的消息不会再补写到电脑端。")) return;
    clearOfflineMessageQueue();
    refreshQueue();
    setStatus("已清空离线消息队列。");
  };

  const openPairingInput = async (options: { clearCurrent?: boolean } = {}) => {
    const token = extractPairingToken(pairingInput);
    if (!token) {
      setPairingInputError("请粘贴电脑端复制的完整绑定链接，或 bind_ 开头的绑定 token。");
      return;
    }
    if (options.clearCurrent) {
      await clearStoredDeviceCredential();
    }
    window.location.href = pairingInstallPath(token);
  };

  return (
    <div className="min-h-screen bg-[#060a10] text-zinc-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[#060a10]/90 px-4 py-3 backdrop-blur-xl">
        <a href="/mobile/chat" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-300">
          <ArrowLeft className="h-4 w-4" />
        </a>
        <div className="flex items-center gap-2 text-sm font-bold">
          <Smartphone className="h-4 w-4 text-cyan-300" />
          设备与连接
        </div>
        <div className="h-10 w-10" />
      </header>

      <main className="mx-auto max-w-md p-4">
        <section className="rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
          {credential ? (
            <>
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold">已绑定电脑端</h1>
                  <p className="mt-1 truncate text-sm text-zinc-400">{credential.device.name}</p>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm">
                <Row label="设备 ID" value={credential.device.id} />
                <Row label="认证方式" value={credential.authMethod === "signature" ? "WebCrypto 签名" : "设备 Token"} />
                <Row label="凭证有效期" value={expiresAt} />
                <Row label="上次在线" value={new Date(credential.device.lastSeenAt).toLocaleString()} />
              </div>
              {credentialStorage ? <CredentialStorageCard storage={credentialStorage} /> : null}
              {credential.authMethod !== "signature" ? (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                    <div>
                      <div className="font-bold">建议升级为 WebCrypto 签名设备</div>
                      <p className="mt-1 leading-relaxed text-amber-100/75">
                        这台手机正在使用局域网兼容 Token 凭证。若之后改用 HTTPS、Tailscale 或 Cloudflare Tunnel，可从电脑端复制新的绑定链接，在下方粘贴后重新绑定为 WebCrypto 签名设备。
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                    <div>
                      <div className="font-bold">WebCrypto 签名已启用</div>
                      <p className="mt-1 leading-relaxed text-emerald-100/75">
                        设备私钥保存在浏览器 IndexedDB，HTTP 和 WebSocket 请求使用签名认证。
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {status ? <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-zinc-300">{status}</div> : null}
              {credential.authMethod !== "signature" ? (
                <PairingLinkPanel
                  value={pairingInput}
                  error={pairingInputError}
                  onChange={(value) => {
                    setPairingInput(value);
                    setPairingInputError(null);
                  }}
                  onSubmit={() => openPairingInput({ clearCurrent: true })}
                  buttonLabel="清除旧凭证并重新绑定"
                />
              ) : null}
              <div className="mt-5 grid gap-3">
                <button onClick={handleRotate} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200">
                  <RefreshCw className="h-4 w-4" />
                  刷新凭证状态
                </button>
                <button onClick={handleForget} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                  <LogOut className="h-4 w-4" />
                  解除并撤销绑定
                </button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <KeyRound className="mx-auto mb-5 h-12 w-12 text-amber-300" />
              <h1 className="text-lg font-bold">这台手机未绑定</h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">请从电脑管理端生成二维码扫码；如果扫码不方便，也可以粘贴电脑端复制的绑定链接。</p>
              {status ? <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-zinc-300">{status}</div> : null}
              <PairingLinkPanel
                value={pairingInput}
                error={pairingInputError}
                onChange={(value) => {
                  setPairingInput(value);
                  setPairingInputError(null);
                }}
                onSubmit={() => openPairingInput()}
                buttonLabel="使用绑定链接"
              />
            </div>
          )}
        </section>
        <section className="mt-4 rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10">
              <Download className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">PWA 安装与后台同步</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                检查这台手机当前浏览器对桌面图标、离线启动和离线消息补写的支持。
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-sm">
            <CapabilityRow label="主屏幕模式" ok={pwaCapabilities.standalone} value={pwaCapabilities.standalone ? "已从桌面图标启动" : "浏览器标签页"} />
            <CapabilityRow label="Service Worker" ok={pwaCapabilities.serviceWorkerSupported && pwaCapabilities.serviceWorkerControlled} value={pwaCapabilities.serviceWorkerControlled ? "离线 shell 已接管" : pwaCapabilities.serviceWorkerSupported ? "支持，等待接管" : "不支持"} />
            <CapabilityRow label="Background Sync" ok={pwaCapabilities.backgroundSyncSupported} value={pwaCapabilities.backgroundSyncSupported ? "可后台补写离线队列" : "需打开聊天页同步"} />
            <CapabilityRow label="IndexedDB" ok={pwaCapabilities.indexedDbSupported} value={pwaCapabilities.indexedDbSupported ? "可保存设备凭证" : "不可用"} />
          </div>
          {pwaCapabilities.recommendations.length ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
              {pwaCapabilities.recommendations.map((recommendation) => (
                <div key={recommendation}>{recommendation}</div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-100">
              当前浏览器能力完整，适合作为长期手机入口使用。
            </div>
          )}
        </section>
        <section className="mt-4 rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${network.quality === "offline" ? "border-red-400/20 bg-red-500/10" : network.quality === "poor" ? "border-amber-400/20 bg-amber-500/10" : "border-cyan-400/20 bg-cyan-500/10"}`}>
              <Wifi className={`h-5 w-5 ${network.quality === "offline" ? "text-red-300" : network.quality === "poor" ? "text-amber-300" : "text-cyan-300"}`} />
            </div>
            <div>
              <h2 className="text-base font-bold">连接与离线队列</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{network.label}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <Metric label="总计" value={queueSummary.count} tone="text-zinc-100" />
            <Metric label="待同步" value={queueSummary.pending} tone="text-cyan-200" />
            <Metric label="同步中" value={queueSummary.syncing} tone="text-amber-200" />
            <Metric label="失败" value={queueSummary.failed} tone="text-red-200" />
          </div>
          {queueSummary.lastError ? (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs leading-relaxed text-red-100">
              最近错误：{queueSummary.lastError}
              {queueSummary.nextRetryAt ? (
                <span className="mt-1 block text-red-100/75">下次自动重试：{new Date(queueSummary.nextRetryAt).toLocaleString()}</span>
              ) : null}
            </div>
          ) : null}
          {queueStorage ? <QueueStorageCard storage={queueStorage} /> : null}
          {queueItems.length ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-200">离线消息明细</span>
                <span className="text-zinc-500">最近 {Math.min(queueItems.length, 5)} / {queueItems.length} 条</span>
              </div>
              {queueItems.slice(0, 5).map((item) => (
                <div key={item.id}>
                  <QueueItem
                    item={item}
                    onRetry={() => handleRetryItem(item)}
                    onRemove={() => handleRemoveItem(item)}
                  />
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3">
            <a href="/mobile/chat" className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200">
              <RefreshCw className="h-4 w-4" />
              打开聊天并同步
            </a>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleRetryQueue} disabled={queueSummary.failed === 0} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100 disabled:opacity-45">
                <RefreshCw className="h-4 w-4" />
                重试失败
              </button>
              <button onClick={handleClearQueue} disabled={queueSummary.count === 0} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 disabled:opacity-45">
                <Trash2 className="h-4 w-4" />
                清空队列
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function CapabilityRow({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <span className="text-zinc-400">{label}</span>
      <span className={`text-right text-xs font-bold ${ok ? "text-emerald-200" : "text-amber-200"}`}>{value}</span>
    </div>
  );
}

function PairingLinkPanel({
  value,
  error,
  onChange,
  onSubmit,
  buttonLabel,
}: {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  buttonLabel: string;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left">
      <label className="text-xs font-bold text-zinc-500">粘贴电脑端绑定链接</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-3 py-3 text-sm outline-none focus:border-cyan-400/60"
        placeholder="http://.../mobile/install/bind_..."
      />
      {error ? <div className="mt-2 text-xs leading-relaxed text-red-200">{error}</div> : null}
      <button onClick={onSubmit} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-[#061016]">
        <Link2 className="h-4 w-4" />
        {buttonLabel}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className="max-w-[62%] truncate text-right font-mono text-xs text-zinc-200">{value}</span>
    </div>
  );
}

function CredentialStorageCard({ storage }: { storage: DeviceCredentialStorageStatus }) {
  const storageLabel = storage.storage === "indexeddb" ? "IndexedDB" : storage.storage === "memory" ? "内存兜底" : "无凭证";
  const tone = storage.storage === "indexeddb" && !storage.legacyLocalStoragePresent
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
    : "border-amber-400/20 bg-amber-500/10 text-amber-100";
  return (
    <div className={`mt-4 rounded-2xl border p-4 text-sm ${tone}`}>
      <div className="flex gap-3">
        <KeyRound className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <div className="font-bold">设备凭证存储：{storageLabel}</div>
          <p className="mt-1 leading-relaxed opacity-80">
            {storage.storage === "indexeddb"
              ? "设备凭证已迁移到浏览器 IndexedDB，旧 localStorage 凭证会自动清理。"
              : "当前浏览器无法使用 IndexedDB，只能保留临时内存状态；重新打开后可能需要重新绑定。"}
          </p>
          <div className="mt-2 grid gap-1 text-xs opacity-80">
            <div>IndexedDB：{storage.indexedDbAvailable ? "可用" : "不可用"}</div>
            <div>localStorage 旧凭证：{storage.legacyLocalStoragePresent ? "仍待迁移" : "已清理"}</div>
            <div>认证方式：{storage.authMethod === "signature" ? "WebCrypto 签名" : storage.authMethod === "token" ? "设备 Token" : "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-2 py-3">
      <div className={`text-lg font-black ${tone}`}>{value}</div>
      <div className="mt-1 text-[10px] font-bold text-zinc-500">{label}</div>
    </div>
  );
}
