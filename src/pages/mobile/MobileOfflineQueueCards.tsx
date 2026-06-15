import {
  formatOfflineMessageQueueBytes,
  getOfflineMessageQueueStorageLabel,
  getOfflineMessageQueueUsageLabel,
  getOfflineMessageRetryLabel,
  getOfflineMessageStatusLabel,
  type OfflineMessageQueueStorageStatus,
  type OfflineQueuedMessage,
} from "../../services/offlineMessageQueue";

export function QueueStorageCard({ storage }: { storage: OfflineMessageQueueStorageStatus }) {
  const tone = storage.available && !storage.nearItemLimit && (storage.usageRatio === undefined || storage.usageRatio <= 0.8)
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
    : "border-amber-400/20 bg-amber-500/10 text-amber-100";
  const storageLabel = getOfflineMessageQueueStorageLabel(storage.storage);
  return (
    <div className={`mt-4 rounded-2xl border p-4 text-xs ${tone}`}>
      <div className="mb-2 font-bold">离线队列存储：{storageLabel}</div>
      <div className="grid gap-1 opacity-85">
        <div>队列数量：{storage.count} / {storage.maxItems}</div>
        <div>队列大小：{formatOfflineMessageQueueBytes(storage.bytes)}</div>
        <div>IndexedDB：{storage.indexedDbAvailable ? "可用" : "不可用"}</div>
        <div>localStorage 兼容镜像：{storage.legacyLocalStoragePresent ? "存在" : "无"}</div>
        <div>浏览器存储占用：{getOfflineMessageQueueUsageLabel(storage)}</div>
        <div>持久化存储：{storage.persistentStorageGranted === true ? "已授予" : storage.persistentStorageGranted === false ? "未授予" : "浏览器未报告"}</div>
      </div>
      {storage.recommendations.length ? (
        <div className="mt-3 space-y-1 border-t border-current/15 pt-3 leading-relaxed opacity-90">
          {storage.recommendations.map((recommendation) => (
            <div key={recommendation}>{recommendation}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function QueueItem({ item, onRetry, onRemove }: { item: OfflineQueuedMessage; onRetry: () => void; onRemove: () => void }) {
  const preview = item.message.parts.find((part) => part.text)?.text || "附件消息";
  const statusLabel = getOfflineMessageStatusLabel(item);
  const retryLabel = getOfflineMessageRetryLabel(item);
  const statusClass = item.status === "failed" ? "border-red-400/20 bg-red-500/10 text-red-100" : item.status === "syncing" ? "border-amber-400/20 bg-amber-500/10 text-amber-100" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-bold text-zinc-100">{preview}</div>
          <div className="mt-1 text-zinc-500">
            {new Date(item.queuedAt).toLocaleString()} · 已尝试 {item.attempts} 次
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>{statusLabel}</span>
      </div>
      {item.lastError ? <div className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 p-2 leading-relaxed text-red-100">失败原因：{item.lastError}</div> : null}
      {retryLabel ? (
        <div
          aria-label={`下次自动重试：${preview}`}
          className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 p-2 leading-relaxed text-amber-100"
        >
          {retryLabel}
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        <button aria-label={`重试离线消息：${preview}`} onClick={onRetry} className="inline-flex flex-1 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 font-bold text-amber-100">
          单条重试
        </button>
        <button aria-label={`删除离线消息：${preview}`} onClick={onRemove} className="inline-flex flex-1 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 font-bold text-red-200">
          删除
        </button>
      </div>
    </div>
  );
}
