import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { getClientState, setClientState } from "../services/lifeosApi";
import { isSensitiveLocalStorageKey } from "../services/sensitiveLocalStorage";

function removeLocalState(key: string) {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    // Browser storage can be unavailable in privacy modes; server state remains authoritative.
  }
}

export function readLocalState<T>(key: string, fallback: T): T {
  if (isSensitiveLocalStorageKey(key)) {
    removeLocalState(key);
    return fallback;
  }
  let raw: string | null = null;
  try {
    if (typeof localStorage === "undefined") return fallback;
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    if (typeof fallback === "string") return raw as T;
    if (typeof fallback === "boolean") return (raw === "true") as T;
    if (typeof fallback === "number") {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed as T : fallback;
    }
    return fallback;
  }
}

export function writeLocalState<T>(key: string, value: T) {
  if (isSensitiveLocalStorageKey(key)) {
    removeLocalState(key);
    return;
  }
  try {
    if (typeof localStorage === "undefined") return;
    if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
      localStorage.setItem(key, String(value));
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local cache is best-effort; synced server state should not be blocked by quota or privacy errors.
  }
}

export function useSyncedClientState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(() => readLocalState(key, fallback));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isSensitiveLocalStorageKey(key)) {
      removeLocalState(key);
      setHydrated(true);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const serverValue = await getClientState<T>(key, readLocalState(key, fallback));
      if (cancelled) return;
      setValue(serverValue);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    writeLocalState(key, value);
    if (hydrated && !isSensitiveLocalStorageKey(key)) void setClientState(key, value);
  }, [key, value, hydrated]);

  return [value, setValue, hydrated];
}
