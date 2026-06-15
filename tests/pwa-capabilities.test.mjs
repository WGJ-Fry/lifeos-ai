// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

function installBrowserGlobals({
  standalone = false,
  serviceWorker = true,
  controlled = true,
  backgroundSync = true,
  indexedDb = true,
  online = true,
} = {}) {
  const windowValue = {
    matchMedia(query) {
      return { matches: query === "(display-mode: standalone)" ? standalone : false };
    },
  };
  if (backgroundSync) windowValue.SyncManager = function SyncManager() {};
  if (indexedDb) windowValue.indexedDB = {};
  Object.defineProperty(globalThis, "window", { value: windowValue, configurable: true });

  const navigatorValue = {
    onLine: online,
    standalone,
  };
  if (serviceWorker) {
    navigatorValue.serviceWorker = {
      controller: controlled ? {} : null,
    };
  }
  Object.defineProperty(globalThis, "navigator", { value: navigatorValue, configurable: true });
}

function cleanupBrowserGlobals() {
  delete globalThis.window;
  delete globalThis.navigator;
}

test("PWA capability status reports a complete installed mobile entry", async (t) => {
  installBrowserGlobals();
  t.after(cleanupBrowserGlobals);
  const { getPwaCapabilityStatus } = await import(`../src/services/pwaCapabilities.ts?case=complete-${Date.now()}`);

  const status = getPwaCapabilityStatus();
  assert.equal(status.standalone, false);
  assert.equal(status.serviceWorkerSupported, true);
  assert.equal(status.serviceWorkerControlled, true);
  assert.equal(status.backgroundSyncSupported, true);
  assert.equal(status.indexedDbSupported, true);
  assert.equal(status.online, true);
  assert.deepEqual(status.recommendations, ["绑定成功后添加到主屏幕，之后可像普通 App 一样打开。"]);
});

test("PWA capability status explains degraded offline sync support", async (t) => {
  installBrowserGlobals({
    standalone: true,
    serviceWorker: true,
    controlled: false,
    backgroundSync: false,
    indexedDb: false,
    online: false,
  });
  t.after(cleanupBrowserGlobals);
  const { getPwaCapabilityStatus } = await import(`../src/services/pwaCapabilities.ts?case=degraded-${Date.now()}`);

  const status = getPwaCapabilityStatus();
  assert.equal(status.standalone, true);
  assert.equal(status.serviceWorkerSupported, true);
  assert.equal(status.serviceWorkerControlled, false);
  assert.equal(status.backgroundSyncSupported, false);
  assert.equal(status.indexedDbSupported, false);
  assert.equal(status.online, false);
  assert.equal(status.recommendations.some((item) => item.includes("离线 shell 正在接管")), true);
  assert.equal(status.recommendations.some((item) => item.includes("后台同步不可用")), true);
  assert.equal(status.recommendations.some((item) => item.includes("IndexedDB 不可用")), true);
  assert.equal(status.recommendations.some((item) => item.includes("当前离线")), true);
});

test("PWA capability status handles browsers without service worker", async (t) => {
  installBrowserGlobals({ serviceWorker: false, backgroundSync: false });
  t.after(cleanupBrowserGlobals);
  const { getPwaCapabilityStatus } = await import(`../src/services/pwaCapabilities.ts?case=no-sw-${Date.now()}`);

  const status = getPwaCapabilityStatus();
  assert.equal(status.serviceWorkerSupported, false);
  assert.equal(status.serviceWorkerControlled, false);
  assert.equal(status.backgroundSyncSupported, false);
  assert.equal(status.recommendations.some((item) => item.includes("当前浏览器不支持离线 shell")), true);
});
