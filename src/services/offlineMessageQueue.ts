import type { Message } from "../types";

const QUEUE_KEY = "lifeos_offline_message_queue";
const DB_NAME = "lifeos-offline-queue";
const STORE_NAME = "queues";
const QUEUE_RECORD_ID = "primary";
const QUEUE_EVENT = "lifeos-offline-message-queue-changed";
const MAX_QUEUE_ITEMS = 100;
const SYNCING_STALE_AFTER_MS = 2 * 60 * 1000;
const FAILED_RETRY_BACKOFF_MS = [15_000, 30_000, 60_000, 2 * 60_000, 5 * 60_000];

export type OfflineQueuedMessage = {
  id: string;
  message: Message;
  queuedAt: number;
  fingerprint: string;
  status: "pending" | "syncing" | "failed";
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string;
};

export type OfflineMessageQueueStorageStatus = {
  storage: "indexeddb" | "localStorage" | "memory" | "unavailable";
  available: boolean;
  indexedDbAvailable: boolean;
  legacyLocalStoragePresent: boolean;
  bytes: number;
  count: number;
  maxItems: number;
  nearItemLimit: boolean;
  persistentStorageGranted: boolean | null;
  usageBytes?: number;
  quotaBytes?: number;
  usageRatio?: number;
  recommendations: string[];
};

type WriteQueueOptions = {
  requestSync?: boolean;
};

let queueCache: OfflineQueuedMessage[] | null = null;
let hydrationPromise: Promise<OfflineQueuedMessage[]> | null = null;
let indexedDbWriteOk = false;

function localStorageAvailable() {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function indexedDbAvailable() {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function readRawQueue() {
  if (!localStorageAvailable()) return "";
  return localStorage.getItem(QUEUE_KEY) || "";
}

function normalizeQueue(value: unknown): OfflineQueuedMessage[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeQueueItem(item)).filter(Boolean) as OfflineQueuedMessage[];
}

function readLegacyQueue(): OfflineQueuedMessage[] {
  try {
    const raw = readRawQueue();
    if (!raw) return [];
    return normalizeQueue(JSON.parse(raw));
  } catch {
    return [];
  }
}

function readQueue(): OfflineQueuedMessage[] {
  if (queueCache) return queueCache;
  queueCache = readLegacyQueue();
  void hydrateOfflineMessageQueue().catch(() => undefined);
  return queueCache;
}

function normalizeQueueItem(item: any): OfflineQueuedMessage | null {
  if (!item?.message || typeof item.queuedAt !== "number") return null;
  const fingerprint = typeof item.fingerprint === "string" ? item.fingerprint : getMessageFingerprint(item.message);
  return {
    id: typeof item.id === "string" ? item.id : fingerprint,
    message: item.message,
    queuedAt: item.queuedAt,
    fingerprint,
    status: item.status === "syncing" || item.status === "failed" ? item.status : "pending",
    attempts: Number.isFinite(item.attempts) ? item.attempts : 0,
    lastAttemptAt: Number.isFinite(item.lastAttemptAt) ? item.lastAttemptAt : undefined,
    lastError: typeof item.lastError === "string" ? item.lastError.slice(0, 500) : undefined,
  };
}

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readIndexedQueue() {
  if (!indexedDbAvailable()) return null;
  const db = await openQueueDb();
  const queue = await new Promise<OfflineQueuedMessage[] | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(QUEUE_RECORD_ID);
    request.onsuccess = () => resolve(request.result ? normalizeQueue(request.result.queue || request.result) : null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return queue;
}

async function writeIndexedQueue(queue: OfflineQueuedMessage[]) {
  if (!indexedDbAvailable()) return false;
  const db = await openQueueDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ queue, updatedAt: Date.now() }, QUEUE_RECORD_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  indexedDbWriteOk = true;
  return true;
}

async function deleteIndexedQueue() {
  if (!indexedDbAvailable()) return false;
  const db = await openQueueDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(QUEUE_RECORD_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  indexedDbWriteOk = true;
  return true;
}

function writeLegacyMirror(queue: OfflineQueuedMessage[]) {
  if (!localStorageAvailable()) return;
  if (queue.length === 0) localStorage.removeItem(QUEUE_KEY);
  else localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function writeQueue(queue: OfflineQueuedMessage[], options: WriteQueueOptions = {}) {
  const next = queue.slice(-MAX_QUEUE_ITEMS);
  queueCache = next;
  writeLegacyMirror(next);
  void writeIndexedQueue(next).catch(() => undefined);
  emitQueueChanged();
  if (options.requestSync !== false) requestBackgroundSync();
}

export async function hydrateOfflineMessageQueue() {
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    const indexed = await readIndexedQueue().catch(() => null);
    const legacy = readLegacyQueue();
    const next = indexed?.length ? indexed : legacy;
    queueCache = next;
    if (legacy.length && !indexed?.length) {
      await writeIndexedQueue(legacy).catch(() => false);
    }
    writeLegacyMirror(next);
    emitQueueChanged();
    return next;
  })();
  return hydrationPromise;
}

function emitQueueChanged() {
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: getOfflineMessageQueueSummary() }));
}

function requestBackgroundSync() {
  const nav = typeof navigator === "undefined" ? null : navigator as any;
  if (!nav?.serviceWorker) return;

  nav.serviceWorker.controller?.postMessage?.({ type: "LIFEOS_QUEUE_UPDATED" });
  nav.serviceWorker.ready
    ?.then((registration: any) => registration.sync?.register?.("lifeos-offline-queue"))
    .catch(() => undefined);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function getMessageFingerprint(message: Message) {
  return stableStringify(message);
}

export function enqueueOfflineMessage(message: Message) {
  const queue = readQueue();
  const fingerprint = getMessageFingerprint(message);
  const existing = queue.find((item) => item.fingerprint === fingerprint);
  if (existing) {
    writeQueue(queue.map((item) => item.id === existing.id ? { ...item, status: "pending", lastError: undefined } : item));
    return existing.id;
  }

  const id = crypto.randomUUID();
  queue.push({
    id,
    message,
    queuedAt: Date.now(),
    fingerprint,
    status: "pending",
    attempts: 0,
  });
  writeQueue(queue);
  return id;
}

export function getOfflineMessageQueue() {
  return readQueue();
}

export function recoverStaleOfflineMessages(now = Date.now()) {
  let changed = false;
  const next = readQueue().map((item) => {
    if (item.status !== "syncing") return item;
    const lastAttemptAt = item.lastAttemptAt || item.queuedAt;
    if (now - lastAttemptAt < SYNCING_STALE_AFTER_MS) return item;
    changed = true;
    return {
      ...item,
      status: "pending" as const,
      lastError: "上次同步中断，已恢复为待同步",
    };
  });
  if (!changed) return;
  writeQueue(next, { requestSync: true });
}

export function getOfflineMessageRetryDelayMs(item: Pick<OfflineQueuedMessage, "attempts">) {
  const index = Math.max(0, Math.min(item.attempts - 1, FAILED_RETRY_BACKOFF_MS.length - 1));
  return FAILED_RETRY_BACKOFF_MS[index];
}

export function getOfflineMessageNextRetryAt(item: OfflineQueuedMessage) {
  if (item.status !== "failed" || !item.lastAttemptAt) return undefined;
  return item.lastAttemptAt + getOfflineMessageRetryDelayMs(item);
}

export function getOfflineMessageStatusLabel(item: Pick<OfflineQueuedMessage, "status">) {
  if (item.status === "failed") return "失败";
  if (item.status === "syncing") return "同步中";
  return "待同步";
}

export function getOfflineMessageRetryLabel(item: OfflineQueuedMessage, now = Date.now()) {
  const nextRetryAt = getOfflineMessageNextRetryAt(item);
  if (!nextRetryAt) return "";
  if (nextRetryAt <= now) return "可立即重试";
  return `下次自动重试：${new Date(nextRetryAt).toLocaleTimeString()}`;
}

export function formatOfflineMessageQueueBytes(bytes: number | undefined) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getOfflineMessageQueueStorageLabel(storage: OfflineMessageQueueStorageStatus["storage"]) {
  if (storage === "indexeddb") return "IndexedDB 主存储";
  if (storage === "localStorage") return "localStorage 兼容存储";
  if (storage === "memory") return "内存临时队列";
  return "不可用";
}

export function getOfflineMessageQueueUsageLabel(storage: Pick<OfflineMessageQueueStorageStatus, "usageRatio" | "quotaBytes">) {
  const usage = storage.usageRatio !== undefined ? `${Math.round(storage.usageRatio * 100)}%` : "-";
  return `${usage}${storage.quotaBytes ? `，可用配额 ${formatOfflineMessageQueueBytes(storage.quotaBytes)}` : ""}`;
}

export function getOfflineMessagesReadyToSync(now = Date.now()) {
  return readQueue().filter((item) => {
    if (item.status === "pending") return true;
    if (item.status === "syncing") {
      const lastAttemptAt = item.lastAttemptAt || item.queuedAt;
      return now - lastAttemptAt >= SYNCING_STALE_AFTER_MS;
    }
    const nextRetryAt = getOfflineMessageNextRetryAt(item);
    return typeof nextRetryAt === "number" && nextRetryAt <= now;
  });
}

export function getOfflineMessageQueueCount() {
  return readQueue().length;
}

export function getOfflineMessageQueueSummary() {
  const queue = readQueue();
  const failed = queue.filter((item) => item.status === "failed").length;
  const syncing = queue.filter((item) => item.status === "syncing").length;
  const pending = queue.length - failed - syncing;
  const lastError = [...queue].reverse().find((item) => item.lastError)?.lastError;
  const nextRetryAt = queue
    .map(getOfflineMessageNextRetryAt)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b)[0];
  return { count: queue.length, pending, syncing, failed, lastError, nextRetryAt };
}

export function removeOfflineMessages(ids: string[]) {
  const idSet = new Set(ids);
  writeQueue(readQueue().filter((item) => !idSet.has(item.id)), { requestSync: false });
}

export function retryOfflineMessage(id: string) {
  writeQueue(readQueue().map((item) => (
    item.id === id ? { ...item, status: "pending", lastError: undefined } : item
  )));
}

export function markOfflineMessageSyncing(id: string) {
  writeQueue(readQueue().map((item) => (
    item.id === id
      ? { ...item, status: "syncing", attempts: item.attempts + 1, lastAttemptAt: Date.now(), lastError: undefined }
      : item
  )), { requestSync: false });
}

export function markOfflineMessageFailed(id: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "同步失败");
  writeQueue(readQueue().map((item) => (
    item.id === id
      ? { ...item, status: "failed", lastAttemptAt: Date.now(), lastError: message }
      : item
  )), { requestSync: false });
}

export function resetFailedOfflineMessages() {
  writeQueue(readQueue().map((item) => (
    item.status === "failed" ? { ...item, status: "pending", lastError: undefined } : item
  )));
}

export function clearOfflineMessageQueue() {
  queueCache = [];
  if (localStorageAvailable()) localStorage.removeItem(QUEUE_KEY);
  void deleteIndexedQueue().catch(() => undefined);
  emitQueueChanged();
}

export async function getOfflineMessageQueueStorageStatus(): Promise<OfflineMessageQueueStorageStatus> {
  await hydrateOfflineMessageQueue().catch(() => readQueue());
  const legacyLocalStoragePresent = Boolean(readRawQueue());
  const indexedAvailable = indexedDbAvailable();
  const available = indexedAvailable || localStorageAvailable();
  const queue = readQueue();
  const raw = readRawQueue() || JSON.stringify(queue);
  const bytes = new Blob([raw]).size;
  const nearItemLimit = queue.length >= Math.floor(MAX_QUEUE_ITEMS * 0.8);
  let persistentStorageGranted: boolean | null = null;
  let usageBytes: number | undefined;
  let quotaBytes: number | undefined;
  let usageRatio: number | undefined;
  const storageManager = typeof navigator === "undefined" ? null : navigator.storage;
  if (storageManager?.persisted) {
    persistentStorageGranted = await storageManager.persisted().catch(() => null);
  }
  if (storageManager?.estimate) {
    const estimate = await storageManager.estimate().catch(() => null);
    if (estimate) {
      usageBytes = Number.isFinite(estimate.usage) ? estimate.usage : undefined;
      quotaBytes = Number.isFinite(estimate.quota) ? estimate.quota : undefined;
      if (usageBytes !== undefined && quotaBytes) usageRatio = usageBytes / quotaBytes;
    }
  }

  const recommendations: string[] = [];
  if (!available) {
    recommendations.push("当前浏览器无法写入本机队列，断网消息可能无法保存。");
  }
  if (!indexedAvailable) {
    recommendations.push("IndexedDB 不可用，离线队列只能使用兼容存储，长期可靠性较弱。");
  }
  if (nearItemLimit) {
    recommendations.push("离线队列接近上限，请先打开聊天页同步，或清理不需要补写的消息。");
  }
  if (usageRatio !== undefined && usageRatio > 0.8) {
    recommendations.push("浏览器存储空间接近上限，请同步并清理旧队列，避免系统自动回收。");
  }
  if (persistentStorageGranted === false) {
    recommendations.push("浏览器未授予持久化存储；长期离线或系统清理空间时，队列可能被回收。");
  }
  if (queue.length === 0 && recommendations.length === 0) {
    recommendations.push("离线队列为空，本机没有待补写消息。");
  }

  return {
    storage: indexedDbWriteOk || indexedAvailable ? "indexeddb" : localStorageAvailable() ? "localStorage" : queue.length ? "memory" : "unavailable",
    available,
    indexedDbAvailable: indexedAvailable,
    legacyLocalStoragePresent,
    bytes,
    count: queue.length,
    maxItems: MAX_QUEUE_ITEMS,
    nearItemLimit,
    persistentStorageGranted,
    usageBytes,
    quotaBytes,
    usageRatio,
    recommendations,
  };
}

export function subscribeOfflineMessageQueue(listener: (summary: ReturnType<typeof getOfflineMessageQueueSummary>) => void) {
  const handleQueueChanged = () => listener(getOfflineMessageQueueSummary());
  window.addEventListener(QUEUE_EVENT, handleQueueChanged);
  window.addEventListener("storage", handleQueueChanged);
  return () => {
    window.removeEventListener(QUEUE_EVENT, handleQueueChanged);
    window.removeEventListener("storage", handleQueueChanged);
  };
}

if (typeof window !== "undefined") {
  void hydrateOfflineMessageQueue().catch(() => undefined);
}
