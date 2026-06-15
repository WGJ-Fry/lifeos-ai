// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

function installStorage(seed = {}) {
  const storage = new Map(Object.entries(seed).map(([key, value]) => [key, String(value)]));
  globalThis.localStorage = {
    get length() {
      return storage.size;
    },
    key(index) {
      return [...storage.keys()][index] || null;
    },
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
  };
  return storage;
}

test("sensitive localStorage cleanup removes legacy secrets without breaking pairing or credential migration", async () => {
  const storage = installStorage({
    lifeos_byok_key: "gemini-secret",
    lifeos_proxy_url: "https://proxy.example.test/sub?token=secret",
    lifeos_openai_api_key: "sk-secret",
    lifeos_some_token: "legacy-token",
    lifeos_pending_pairing_intent: JSON.stringify({ token: "bind_keep_pairing", expiresAt: Date.now() + 60_000 }),
    lifeos_device_credential: JSON.stringify({ accessToken: "device-token-to-migrate" }),
    lifeos_offline_message_queue: "[]",
    lifeos_admin_session: JSON.stringify({ expiresAt: Date.now() + 60_000 }),
    lifeos_model_engine: "Gemini 2.0 Flash",
    lifeos_proxy_enabled: "true",
    omnipreview_device: "iphone",
  });

  const cleanup = await import(`../src/services/sensitiveLocalStorage.ts?case=cleanup-${Date.now()}`);
  const result = cleanup.clearSensitiveLocalStorageResidue();

  assert.deepEqual(result.removedKeys.sort(), [
    "lifeos_byok_key",
    "lifeos_openai_api_key",
    "lifeos_proxy_url",
    "lifeos_some_token",
  ]);
  assert.equal(storage.has("lifeos_byok_key"), false);
  assert.equal(storage.has("lifeos_proxy_url"), false);
  assert.equal(storage.has("lifeos_openai_api_key"), false);
  assert.equal(storage.has("lifeos_some_token"), false);
  assert.equal(storage.has("lifeos_pending_pairing_intent"), true);
  assert.equal(storage.has("lifeos_device_credential"), true);
  assert.equal(storage.has("lifeos_offline_message_queue"), true);
  assert.equal(storage.has("lifeos_admin_session"), true);
  assert.equal(storage.has("lifeos_model_engine"), true);
  assert.equal(storage.has("lifeos_proxy_enabled"), true);
  assert.equal(storage.has("omnipreview_device"), true);
});

test("sensitive key classifier blocks future synced client state regressions", async () => {
  installStorage();
  const cleanup = await import(`../src/services/sensitiveLocalStorage.ts?case=classifier-${Date.now()}`);

  assert.equal(cleanup.isSensitiveLocalStorageKey("lifeos_proxy_url"), true);
  assert.equal(cleanup.isSensitiveLocalStorageKey("lifeos_byok_key"), true);
  assert.equal(cleanup.isSensitiveLocalStorageKey("lifeos_pending_pairing_intent"), false);
  assert.equal(cleanup.isSensitiveLocalStorageKey("lifeos_device_credential"), false);
  assert.equal(cleanup.isSensitiveLocalStorageKey("lifeos_offline_message_queue"), false);
  assert.equal(cleanup.isSensitiveLocalStorageKey("lifeos_model_engine"), false);
});

test("sensitive localStorage cleanup reports failed removals without crashing startup", async () => {
  globalThis.localStorage = {
    length: 2,
    key(index) {
      return index === 0 ? "lifeos_byok_key" : "lifeos_proxy_url";
    },
    removeItem(key) {
      if (key === "lifeos_proxy_url") throw new Error("blocked");
    },
  };
  const cleanup = await import(`../src/services/sensitiveLocalStorage.ts?case=failed-removal-${Date.now()}`);
  const result = cleanup.clearSensitiveLocalStorageResidue();

  assert.deepEqual(result.removedKeys, ["lifeos_byok_key"]);
  assert.deepEqual(result.failedKeys, ["lifeos_proxy_url"]);
});

test("sensitive localStorage cleanup tolerates blocked key enumeration", async () => {
  globalThis.localStorage = {
    get length() {
      throw new Error("blocked");
    },
    key() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("should not be called");
    },
  };
  const cleanup = await import(`../src/services/sensitiveLocalStorage.ts?case=blocked-enumeration-${Date.now()}`);

  assert.doesNotThrow(() => cleanup.clearSensitiveLocalStorageResidue());
  assert.deepEqual(cleanup.clearSensitiveLocalStorageResidue(), { removedKeys: [], failedKeys: [] });
});
