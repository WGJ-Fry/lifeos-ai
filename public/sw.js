const CACHE_NAME = "lifeos-ai-shell-v4";
const OFFLINE_FALLBACK = "/offline.html";
const SHELL_ASSETS = [
  "/",
  "/mobile/chat",
  "/mobile/device",
  "/mobile/pair",
  "/mobile/actions",
  OFFLINE_FALLBACK,
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/screenshots/real-mobile-chat.jpg",
  "/screenshots/real-mobile-device.jpg",
];

function extractBuildAssets(html) {
  return Array.from(new Set((html.match(/\/assets\/[^"'<>\\\s)]+/g) || []).map((asset) => asset.trim())));
}

async function cacheBuildAssets(cache) {
  try {
    const response = await fetch("/", { cache: "no-store" });
    if (!response.ok) return;
    const html = await response.text();
    const buildAssets = extractBuildAssets(html);
    if (buildAssets.length) await cache.addAll(buildAssets);
  } catch (error) {
    console.warn("LifeOS service worker could not pre-cache build assets", error);
  }
}

async function notifyClients(message) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    client.postMessage(message);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(SHELL_ASSETS);
        await cacheBuildAssets(cache);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin || request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) return response;
          return caches.match(request).then((cached) => cached || caches.match("/mobile/chat") || caches.match(OFFLINE_FALLBACK) || response);
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/mobile/chat") || caches.match(OFFLINE_FALLBACK))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "LIFEOS_SKIP_WAITING") {
    event.waitUntil?.(self.skipWaiting());
    return;
  }

  if (event.data?.type === "LIFEOS_QUEUE_UPDATED") {
    event.waitUntil?.(notifyClients({ type: "LIFEOS_SYNC_OFFLINE_QUEUE", reason: "queue-updated" }));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "lifeos-offline-queue") {
    event.waitUntil(notifyClients({ type: "LIFEOS_SYNC_OFFLINE_QUEUE", reason: "background-sync" }));
  }
});
