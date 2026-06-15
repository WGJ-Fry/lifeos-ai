const PAIRING_INTENT_KEY = "lifeos_pending_pairing_intent";
const PAIRING_INTENT_TTL_MS = 24 * 60 * 60 * 1000;
const INSTALL_PATH_PREFIX = "/mobile/install/";

type PairingIntent = {
  token: string;
  createdAt: number;
  expiresAt: number;
};

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
  localStorage.setItem(PAIRING_INTENT_KEY, JSON.stringify(intent));
}

export function peekPendingPairingToken(now = Date.now()) {
  const raw = localStorage.getItem(PAIRING_INTENT_KEY);
  if (!raw) return "";
  try {
    const intent = JSON.parse(raw) as Partial<PairingIntent>;
    const token = normalizeToken(intent.token);
    if (!token || typeof intent.expiresAt !== "number" || intent.expiresAt <= now) {
      localStorage.removeItem(PAIRING_INTENT_KEY);
      return "";
    }
    return token;
  } catch {
    localStorage.removeItem(PAIRING_INTENT_KEY);
    return "";
  }
}

export function consumePendingPairingToken(now = Date.now()) {
  const token = peekPendingPairingToken(now);
  if (token) {
    localStorage.removeItem(PAIRING_INTENT_KEY);
    return token;
  }
  return "";
}

export function clearPendingPairingToken() {
  localStorage.removeItem(PAIRING_INTENT_KEY);
}

export function setPairingManifestToken(token: string) {
  const normalized = extractPairingToken(token);
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifest) return () => {};
  const previousHref = manifest.getAttribute("href") || "/manifest.webmanifest";
  if (normalized) {
    manifest.setAttribute("href", `/manifest.webmanifest?pairingToken=${encodeURIComponent(normalized)}`);
  }
  return () => {
    manifest.setAttribute("href", previousHref);
  };
}
