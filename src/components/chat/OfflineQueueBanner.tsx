import { getOfflineMessageRetryLabel, getOfflineMessageStatusLabel } from "../../services/offlineMessageQueue";
import type { OfflineQueuedMessage } from "../../services/offlineMessageQueue";
import type { NetworkStatus } from "../../services/networkStatus";

type OfflineQueueSummary = {
  count: number;
  pending: number;
  syncing: number;
  failed: number;
  lastError?: string;
  nextRetryAt?: number;
};

type OfflineQueueBannerProps = {
  items: OfflineQueuedMessage[];
  status: "idle" | "syncing" | "error";
  summary: OfflineQueueSummary;
  onClear: () => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onSyncAll: () => void;
  network: NetworkStatus;
};

export default function OfflineQueueBanner({
  items,
  status,
  summary,
  onClear,
  onRemove,
  onRetry,
  onSyncAll,
  network,
}: OfflineQueueBannerProps) {
  if (summary.count === 0 && network.quality !== "offline" && network.quality !== "poor") return null;

  return (
    <div className={`rounded-2xl border p-3 text-xs font-semibold ${network.quality === "offline" ? "border-red-400/20 bg-red-500/10 text-red-100" : "border-amber-400/20 bg-amber-500/10 text-amber-100"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          {summary.count === 0
            ? network.label
            : status === "syncing"
              ? `正在同步 ${summary.syncing || summary.count} 条离线消息...`
              : status === "error"
                ? `还有 ${summary.failed || summary.count} 条离线消息同步失败`
                : `还有 ${summary.pending || summary.count} 条离线消息等待同步`}
          {network.quality === "poor" && summary.count > 0 ? (
            <span className="mt-1 block text-[10px] text-amber-200/70">{network.label}</span>
          ) : null}
          {summary.lastError ? (
            <span className="mt-1 block truncate text-[10px] text-amber-200/70">{summary.lastError}</span>
          ) : null}
          {summary.nextRetryAt && summary.failed > 0 ? (
            <span className="mt-1 block text-[10px] text-amber-200/70">下次自动重试：{new Date(summary.nextRetryAt).toLocaleTimeString()}</span>
          ) : null}
        </span>
        {summary.count > 0 ? (
          <>
            <button
              onClick={onSyncAll}
              disabled={status === "syncing" || network.quality === "offline"}
              className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[11px] font-bold text-amber-100 disabled:opacity-50"
            >
              全部重试
            </button>
            <button
              onClick={onClear}
              className="shrink-0 rounded-full border border-red-300/25 bg-red-300/10 px-3 py-1 text-[11px] font-bold text-red-100"
            >
              清空
            </button>
          </>
        ) : null}
      </div>
      {summary.count > 0 ? <div className="mt-3 space-y-2 border-t border-amber-200/15 pt-3">
        {items.slice(0, 3).map((item) => {
          const preview = item.message.parts.find((part) => part.text)?.text || "附件消息";
          const retryLabel = getOfflineMessageRetryLabel(item);
          return (
            <div key={item.id} className="rounded-xl border border-amber-200/15 bg-black/10 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[11px] text-amber-50/80">{preview}</span>
                <span className="shrink-0 rounded-full bg-amber-200/10 px-2 py-0.5 text-[10px] text-amber-100/80">{getOfflineMessageStatusLabel(item)}</span>
              </div>
              {item.lastError ? <div className="mt-1 truncate text-[10px] text-red-100/80">{item.lastError}</div> : null}
              {retryLabel ? <div className="mt-1 text-[10px] text-amber-100/65">{retryLabel}</div> : null}
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => onRetry(item.id)} className="rounded-full border border-amber-200/20 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                  单条重试
                </button>
                <button onClick={() => onRemove(item.id)} className="rounded-full border border-red-200/20 px-2 py-0.5 text-[10px] font-bold text-red-100">
                  删除
                </button>
              </div>
            </div>
          );
        })}
        {items.length > 3 ? <div className="text-[10px] text-amber-100/60">还有 {items.length - 3} 条离线消息未显示</div> : null}
      </div> : null}
    </div>
  );
}
