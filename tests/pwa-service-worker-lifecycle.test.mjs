// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

function installServiceWorkerMock({ controller = null, registration } = {}) {
  Object.defineProperty(globalThis, "navigator", {
    value: {
      serviceWorker: {
        controller,
        getRegistration: async () => registration,
        addEventListener() {},
        removeEventListener() {},
      },
    },
    configurable: true,
  });
}

function cleanupBrowserGlobals() {
  delete globalThis.navigator;
  delete globalThis.window;
}

test("PWA service worker lifecycle reports unsupported browsers", async (t) => {
  Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
  t.after(cleanupBrowserGlobals);
  const { getPwaServiceWorkerLifecycleStatus } = await import(`../src/services/pwaServiceWorkerLifecycle.ts?case=unsupported-${Date.now()}`);

  const status = await getPwaServiceWorkerLifecycleStatus();
  assert.equal(status.supported, false);
  assert.equal(status.tone, "risk");
  assert.equal(status.titleKey, "mobileDevice.swUnsupportedTitle");
});

test("PWA service worker lifecycle reports a waiting update", async (t) => {
  installServiceWorkerMock({
    controller: {},
    registration: {
      waiting: {},
      installing: null,
      active: {},
    },
  });
  t.after(cleanupBrowserGlobals);
  const { getPwaServiceWorkerLifecycleStatus } = await import(`../src/services/pwaServiceWorkerLifecycle.ts?case=waiting-${Date.now()}`);

  const status = await getPwaServiceWorkerLifecycleStatus();
  assert.equal(status.registered, true);
  assert.equal(status.controlled, true);
  assert.equal(status.waiting, true);
  assert.equal(status.updateAvailable, true);
  assert.equal(status.tone, "warn");
  assert.equal(status.titleKey, "mobileDevice.swUpdateReadyTitle");
});

test("PWA service worker lifecycle reports a current controlled shell", async (t) => {
  installServiceWorkerMock({
    controller: {},
    registration: {
      waiting: null,
      installing: null,
      active: {},
    },
  });
  t.after(cleanupBrowserGlobals);
  const { getPwaServiceWorkerLifecycleStatus } = await import(`../src/services/pwaServiceWorkerLifecycle.ts?case=ready-${Date.now()}`);

  const status = await getPwaServiceWorkerLifecycleStatus();
  assert.equal(status.registered, true);
  assert.equal(status.controlled, true);
  assert.equal(status.active, true);
  assert.equal(status.updateAvailable, false);
  assert.equal(status.tone, "ok");
  assert.equal(status.titleKey, "mobileDevice.swReadyTitle");
});
