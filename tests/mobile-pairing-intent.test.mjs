// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

function installStorage() {
  const storage = new Map();
  globalThis.localStorage = {
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

function createFakeIndexedDb() {
  const databases = new Map();
  return {
    open(name) {
      const request = {};
      queueMicrotask(() => {
        const stores = databases.get(name) || new Map();
        databases.set(name, stores);
        request.result = {
          objectStoreNames: {
            contains(storeName) {
              return stores.has(storeName);
            },
          },
          createObjectStore(storeName) {
            if (!stores.has(storeName)) stores.set(storeName, new Map());
          },
          transaction(storeName) {
            const store = stores.get(storeName);
            return {
              objectStore() {
                return {
                  get(key) {
                    const getRequest = {};
                    queueMicrotask(() => {
                      getRequest.result = store?.get(key);
                      getRequest.onsuccess?.();
                    });
                    return getRequest;
                  },
                  put(value, key) {
                    store?.set(key, value);
                  },
                  delete(key) {
                    store?.delete(key);
                  },
                };
              },
              set oncomplete(handler) {
                queueMicrotask(handler);
              },
              set onerror(_handler) {},
            };
          },
          close() {},
        };
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };
}

test("mobile pairing intent survives PWA start_url reset and is consumed once", async () => {
  installStorage();
  delete globalThis.indexedDB;
  const pairing = await import(`../src/services/mobilePairingIntent.ts?case=${Date.now()}`);

  pairing.savePendingPairingToken("bind_install_from_safari", 1_000);
  assert.equal(pairing.peekPendingPairingToken(2_000), "bind_install_from_safari");
  assert.equal(pairing.peekPendingPairingToken(11 * 60 * 1000), "bind_install_from_safari");
  assert.equal(pairing.consumePendingPairingToken(2_000), "bind_install_from_safari");
  assert.equal(pairing.consumePendingPairingToken(2_001), "");
});

test("mobile pairing intent ignores invalid or expired tokens", async () => {
  const storage = installStorage();
  delete globalThis.indexedDB;
  const pairing = await import(`../src/services/mobilePairingIntent.ts?case=expired-${Date.now()}`);

  pairing.savePendingPairingToken("not-a-bind-token", 1_000);
  assert.equal(pairing.consumePendingPairingToken(2_000), "");

  pairing.savePendingPairingToken("bind_expired_token", 1_000);
  assert.equal(pairing.consumePendingPairingToken(25 * 60 * 60 * 1000), "");

  storage.set(
    "lifeos_pending_pairing_intent",
    JSON.stringify({ token: "bind_<script>alert(1)</script>", expiresAt: 25 * 60 * 60 * 1000 }),
  );
  assert.equal(pairing.peekPendingPairingToken(2_000), "");
  assert.equal(storage.has("lifeos_pending_pairing_intent"), false);
});

test("mobile pairing intent uses IndexedDB primary storage and clears legacy localStorage", async () => {
  const storage = installStorage();
  globalThis.indexedDB = createFakeIndexedDb();
  const pairing = await import(`../src/services/mobilePairingIntent.ts?case=indexed-primary-${Date.now()}`);

  pairing.savePendingPairingToken("bind_indexed_primary", 1_000);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(storage.has("lifeos_pending_pairing_intent"), false);
  assert.equal(await pairing.peekPendingPairingTokenAsync(2_000), "bind_indexed_primary");

  pairing.clearPendingPairingIntentCacheForTests();
  assert.equal(pairing.peekPendingPairingToken(2_000), "");
  assert.equal(await pairing.consumePendingPairingTokenAsync(2_000), "bind_indexed_primary");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(await pairing.peekPendingPairingTokenAsync(2_001), "");
  assert.equal(storage.has("lifeos_pending_pairing_intent"), false);

  delete globalThis.indexedDB;
});

test("mobile pairing intent migrates legacy localStorage into IndexedDB", async () => {
  const storage = installStorage();
  globalThis.indexedDB = createFakeIndexedDb();
  storage.set("lifeos_pending_pairing_intent", JSON.stringify({
    token: "bind_legacy_migrate",
    createdAt: 1_000,
    expiresAt: 10_000,
  }));
  const pairing = await import(`../src/services/mobilePairingIntent.ts?case=legacy-migrate-${Date.now()}`);

  assert.equal(await pairing.peekPendingPairingTokenAsync(2_000), "bind_legacy_migrate");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(storage.has("lifeos_pending_pairing_intent"), false);

  pairing.clearPendingPairingIntentCacheForTests();
  assert.equal(await pairing.consumePendingPairingTokenAsync(2_000), "bind_legacy_migrate");

  delete globalThis.indexedDB;
});

test("mobile pairing intent extracts tokens from install start URLs", async () => {
  installStorage();
  delete globalThis.indexedDB;
  const pairing = await import(`../src/services/mobilePairingIntent.ts?case=url-${Date.now()}`);

  assert.equal(pairing.extractPairingToken("bind_direct_token"), "bind_direct_token");
  assert.equal(
    pairing.extractPairingToken("http://phone.test/mobile/chat?pairingToken=bind_from_manifest"),
    "bind_from_manifest",
  );
  assert.equal(
    pairing.extractPairingToken("http://phone.test/mobile/pair?token=bind_from_pair_page"),
    "bind_from_pair_page",
  );
  assert.equal(
    pairing.extractPairingToken("http://phone.test/mobile/install/bind_from_install_path"),
    "bind_from_install_path",
  );
  assert.equal(pairing.extractPairingToken("/mobile/install/bind_from_relative_path"), "bind_from_relative_path");
  assert.equal(pairing.extractPairingToken("http://phone.test/mobile/chat"), "");
  assert.equal(pairing.pairingInstallPath("bind_from_path_helper"), "/mobile/install/bind_from_path_helper");
});

test("mobile pairing intent rejects malformed or unsafe install tokens", async () => {
  installStorage();
  delete globalThis.indexedDB;
  const pairing = await import(`../src/services/mobilePairingIntent.ts?case=unsafe-${Date.now()}`);

  assert.equal(pairing.extractPairingToken("bind_short"), "");
  assert.equal(pairing.extractPairingToken("bind_<script>alert(1)</script>"), "");
  assert.equal(pairing.extractPairingToken("http://phone.test/mobile/install/%E0%A4%A"), "");
  assert.equal(pairing.extractPairingToken("http://phone.test/mobile/install/bind_unsafe_token_123%2Fextra"), "");
  assert.equal(pairing.extractPairingToken("http://phone.test/mobile/chat?pairingToken=bind_<script>alert(1)</script>"), "");
  assert.equal(pairing.pairingInstallPath("bind_<script>alert(1)</script>"), "/mobile/chat");
});

test("mobile pair page can switch manifest href for iOS add-to-home-screen", async () => {
  installStorage();
  delete globalThis.indexedDB;
  const pairing = await import(`../src/services/mobilePairingIntent.ts?case=manifest-${Date.now()}`);
  const manifest = {
    href: "/manifest.webmanifest",
    getAttribute(name) {
      return name === "href" ? this.href : null;
    },
    setAttribute(name, value) {
      if (name === "href") this.href = value;
    },
  };
  globalThis.document = {
    querySelector(selector) {
      return selector === 'link[rel="manifest"]' ? manifest : null;
    },
  };

  const restore = pairing.setPairingManifestToken("bind_install_token");
  assert.equal(manifest.href, "/manifest.webmanifest?pairingToken=bind_install_token");
  restore();
  assert.equal(manifest.href, "/manifest.webmanifest");

  delete globalThis.document;
});
