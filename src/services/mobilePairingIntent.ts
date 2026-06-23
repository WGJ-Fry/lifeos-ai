import { apiUrl } from "./lifeosApi";

const PAIRING_INTENT_KEY = "lifeos_pending_pairing_intent";
const PAIRING_INTENT_TTL_MS = 24 * 60 * 60 * 1000;
const INSTALL_PATH_PREFIX = "/mobile/install/";
const DB_NAME = "lifeos-pairing-intent";
const STORE_NAME = "intents";
const PAIRING_INTENT_RECORD_ID = "pending";

type PairingIntent = {
  token: string;
  createdAt: number;
  expiresAt: number;
};

let intentCache: PairingIntent | null | undefined;
let hydratePromise: Promise<string> | null = null;

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function normalizeToken(token: unknown) {
  if (typeof token !== "string") return "";
  const normalized = token.trim();
  if (!/^bind_[A-Za-z0-9_-]{8,180}$/.test(normalized)) return "";
  return normalized;
}

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

function normalizeIntent(value: unknown, now = Date.now()): PairingIntent | null {
  const intent = value as Partial<PairingIntent> | null;
  const token = normalizeToken(intent?.token);
  if (!token || typeof intent?.expiresAt !== "number" || intent.expiresAt <= now) return null;
  return {
    token,
    createdAt: typeof intent.createdAt === "number" ? intent.createdAt : Math.max(0, intent.expiresAt - PAIRING_INTENT_TTL_MS),
    expiresAt: intent.expiresAt,
  };
}

function readLegacyPairingIntent(now = Date.now()) {
  if (!localStorageAvailable()) return null;
  const raw = localStorage.getItem(PAIRING_INTENT_KEY);
  if (!raw) return null;
  try {
    const intent = normalizeIntent(JSON.parse(raw), now);
    if (!intent) localStorage.removeItem(PAIRING_INTENT_KEY);
    return intent;
  } catch {
    localStorage.removeItem(PAIRING_INTENT_KEY);
    return null;
  }
}

function openPairingIntentDb(): Promise<IDBDatabase> {
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

async function readIndexedPairingIntent(now = Date.now()) {
  if (!indexedDbAvailable()) return null;
  const db = await openPairingIntentDb();
  const intent = await new Promise<PairingIntent | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(PAIRING_INTENT_RECORD_ID);
    request.onsuccess = () => resolve(normalizeIntent(request.result, now));
    request.onerror = () => reject(request.error);
  });
  db.close();
  return intent;
}

async function writeIndexedPairingIntent(intent: PairingIntent | null) {
  if (!indexedDbAvailable()) return false;
  const db = await openPairingIntentDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    if (intent) store.put(intent, PAIRING_INTENT_RECORD_ID);
    else store.delete(PAIRING_INTENT_RECORD_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  return true;
}

async function hydratePendingPairingIntent(now = Date.now()) {
  const indexed = await readIndexedPairingIntent(now).catch(() => null);
  if (indexed) {
    intentCache = indexed;
    if (localStorageAvailable()) localStorage.removeItem(PAIRING_INTENT_KEY);
    return indexed.token;
  }

  const legacy = readLegacyPairingIntent(now);
  intentCache = legacy;
  if (!legacy) return "";

  const written = await writeIndexedPairingIntent(legacy).catch(() => false);
  if (written && localStorageAvailable()) localStorage.removeItem(PAIRING_INTENT_KEY);
  return legacy.token;
}

export function extractPairingToken(raw: string) {
  const directToken = normalizeToken(raw);
  if (directToken) return directToken;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "";
  try {
    const fallbackOrigin = typeof window === "undefined" ? "http://lifeos.local" : window.location.origin;
    const parsed = new URL(value, fallbackOrigin);
    const pathToken = parsed.pathname.startsWith(INSTALL_PATH_PREFIX)
      ? safeDecodeURIComponent(parsed.pathname.slice(INSTALL_PATH_PREFIX.length))
      : "";
    return normalizeToken(pathToken) || normalizeToken(parsed.searchParams.get("token")) || normalizeToken(parsed.searchParams.get("pairingToken"));
  } catch {
    if (value.startsWith(INSTALL_PATH_PREFIX)) {
      return normalizeToken(safeDecodeURIComponent(value.slice(INSTALL_PATH_PREFIX.length)));
    }
    return "";
  }
}

export function pairingInstallPath(token: string) {
  const normalized = extractPairingToken(token);
  if (!normalized.startsWith("bind_")) return "/mobile/chat";
  return `${INSTALL_PATH_PREFIX}${encodeURIComponent(normalized)}`;
}

export function savePendingPairingToken(token: string, now = Date.now()) {
  const normalized = extractPairingToken(token);
  if (!normalized.startsWith("bind_")) return;
  const intent: PairingIntent = {
    token: normalized,
    createdAt: now,
    expiresAt: now + PAIRING_INTENT_TTL_MS,
  };
  intentCache = intent;
  void writeIndexedPairingIntent(intent)
    .then((written) => {
      if (written && localStorageAvailable()) localStorage.removeItem(PAIRING_INTENT_KEY);
      else if (!written && localStorageAvailable()) localStorage.setItem(PAIRING_INTENT_KEY, JSON.stringify(intent));
    })
    .catch(() => {
      if (localStorageAvailable()) localStorage.setItem(PAIRING_INTENT_KEY, JSON.stringify(intent));
    });
}

export function peekPendingPairingToken(now = Date.now()) {
  const cached = normalizeIntent(intentCache, now);
  if (cached) return cached.token;

  const legacy = readLegacyPairingIntent(now);
  if (legacy) {
    intentCache = legacy;
    void writeIndexedPairingIntent(legacy)
      .then((written) => {
        if (written && localStorageAvailable()) localStorage.removeItem(PAIRING_INTENT_KEY);
      })
      .catch(() => null);
    return legacy.token;
  }

  intentCache = null;
  void peekPendingPairingTokenAsync(now).catch(() => "");
  return "";
}

export async function peekPendingPairingTokenAsync(now = Date.now()) {
  const cached = normalizeIntent(intentCache, now);
  if (cached) return cached.token;
  if (!hydratePromise) {
    hydratePromise = hydratePendingPairingIntent(now).finally(() => {
      hydratePromise = null;
    });
  }
  return hydratePromise;
}

export function consumePendingPairingToken(now = Date.now()) {
  const token = peekPendingPairingToken(now);
  if (token) {
    clearPendingPairingToken();
    return token;
  }
  return "";
}

export async function consumePendingPairingTokenAsync(now = Date.now()) {
  const token = await peekPendingPairingTokenAsync(now);
  if (token) {
    clearPendingPairingToken();
    return token;
  }
  return "";
}

export function clearPendingPairingToken() {
  intentCache = null;
  void writeIndexedPairingIntent(null).catch(() => null);
  if (localStorageAvailable()) localStorage.removeItem(PAIRING_INTENT_KEY);
}

export function getPendingPairingIntentStorageStatus() {
  return {
    indexedDbAvailable: indexedDbAvailable(),
    legacyLocalStoragePresent: localStorageAvailable() ? Boolean(localStorage.getItem(PAIRING_INTENT_KEY)) : false,
    cached: Boolean(normalizeIntent(intentCache)),
  };
}

export function clearPendingPairingIntentCacheForTests() {
  intentCache = undefined;
  hydratePromise = null;
}

export function setPairingManifestToken(token: string) {
  const normalized = extractPairingToken(token);
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifest) return () => {};
  const previousHref = manifest.getAttribute("href") || apiUrl("/manifest.webmanifest");
  if (normalized) {
    manifest.setAttribute("href", `${apiUrl("/manifest.webmanifest")}?pairingToken=${encodeURIComponent(normalized)}`);
  }
  return () => {
    manifest.setAttribute("href", previousHref);
  };
}
