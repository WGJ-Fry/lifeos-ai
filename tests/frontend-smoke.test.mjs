import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);

function request(port, pathname, options = {}) {
  return fetch(`http://127.0.0.1:${port}${pathname}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
}

async function waitForServer(port, child, output) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    if (child.exitCode !== null) throw new Error(`server exited early with code ${child.exitCode}\n${output.join("")}`);
    try {
      const response = await request(port, "/api/v1/health");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`server did not become healthy on port ${port}; exitCode=${child.exitCode}; signalCode=${child.signalCode}\n${output.join("")}`);
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

async function getOpenPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

test("production build serves desktop admin, mobile PWA, manifest, and service worker", async (t) => {
  const port = await getOpenPort();
  const dataDir = await mkdtemp(path.join(tmpdir(), "lifeos-frontend-smoke-"));
  const child = spawn(process.execPath, ["dist/server.cjs"], {
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      LIFEOS_PORT: String(port),
      LIFEOS_DATA_DIR: dataDir,
      LIFEOS_HOST: "127.0.0.1",
      PUBLIC_BASE_URL: "",
      APP_URL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const childOutput = [];
  child.stdout.on("data", (chunk) => childOutput.push(chunk.toString()));
  child.stderr.on("data", (chunk) => childOutput.push(chunk.toString()));

  t.after(async () => {
    await stopServer(child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await waitForServer(port, child, childOutput);

  for (const route of ["/", "/admin/login", "/admin/onboarding", "/admin/settings", "/mobile/chat", "/mobile/actions", "/mobile/device", "/mobile/pair?token=demo", "/mobile/install/bind_shell_demo_123"]) {
    const response = await request(port, route);
    assert.equal(response.status, 200, `${route} should render the SPA shell`);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
    const html = await response.text();
    assert.match(html, /<div id="root">/);
    assert.match(html, /\/assets\//);
  }

  const installPairHtmlResponse = await request(port, "/mobile/pair?token=bind_install_pair_page_123");
  assert.equal(installPairHtmlResponse.status, 200);
  assert.match(installPairHtmlResponse.headers.get("cache-control") || "", /no-store/);
  assert.match(installPairHtmlResponse.headers.get("set-cookie") || "", /lifeos_pairing_intent=bind_install_pair_page_123/);
  const installPairHtml = await installPairHtmlResponse.text();
  assert.match(installPairHtml, /href="\/manifest\.webmanifest\?pairingToken=bind_install_pair_page_123"/);

  const installChatHtmlResponse = await request(port, "/mobile/chat?pairingToken=bind_install_chat_page_123");
  assert.equal(installChatHtmlResponse.status, 200);
  assert.match(installChatHtmlResponse.headers.get("cache-control") || "", /no-store/);
  assert.match(installChatHtmlResponse.headers.get("set-cookie") || "", /lifeos_pairing_intent=bind_install_chat_page_123/);
  const installChatHtml = await installChatHtmlResponse.text();
  assert.match(installChatHtml, /href="\/manifest\.webmanifest\?pairingToken=bind_install_chat_page_123"/);

  const installPathHtmlResponse = await request(port, "/mobile/install/bind_install_path_page_123");
  assert.equal(installPathHtmlResponse.status, 200);
  assert.match(installPathHtmlResponse.headers.get("cache-control") || "", /no-store/);
  assert.match(installPathHtmlResponse.headers.get("set-cookie") || "", /lifeos_pairing_intent=bind_install_path_page_123/);
  const installPathHtml = await installPathHtmlResponse.text();
  assert.match(installPathHtml, /href="\/manifest\.webmanifest\?pairingToken=bind_install_path_page_123"/);

  const installIntentResponse = await request(port, "/api/v1/mobile/pairing-intent", {
    headers: { Cookie: "lifeos_pairing_intent=bind_install_cookie_recovery_123" },
  });
  assert.equal(installIntentResponse.status, 200);
  assert.match(installIntentResponse.headers.get("cache-control") || "", /no-store/);
  assert.deepEqual(await installIntentResponse.json(), { token: "bind_install_cookie_recovery_123" });

  const offlineResponse = await request(port, "/offline.html");
  assert.equal(offlineResponse.status, 200);
  assert.match(offlineResponse.headers.get("content-type") || "", /text\/html/);
  const offlineHtml = await offlineResponse.text();
  assert.match(offlineHtml, /当前离线/);
  assert.match(offlineHtml, /查看设备与离线队列/);
  assert.match(offlineHtml, /lifeos_offline_message_queue/);
  assert.match(offlineHtml, /lifeos-offline-queue/);
  assert.match(offlineHtml, /队列来源/);
  assert.match(offlineHtml, /IndexedDB/);
  assert.match(offlineHtml, /offline-queue-status/);
  assert.match(offlineHtml, /单条处理/);

  const manifestResponse = await request(port, "/manifest.webmanifest");
  assert.equal(manifestResponse.status, 200);
  assert.match(manifestResponse.headers.get("content-type") || "", /json|manifest/);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.name, "LifeOS AI");
  assert.equal(manifest.id, "/mobile/chat");
  assert.equal(manifest.start_url, "/mobile/chat");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.display_override?.includes("standalone"));
  assert.equal(manifest.launch_handler?.client_mode, "navigate-existing");
  assert.equal(manifest.prefer_related_applications, false);
  assert.ok(manifest.icons?.length >= 1);
  assert.ok(manifest.icons.some((icon) => icon.src === "/icons/icon-192.png" && icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(manifest.icons.some((icon) => icon.src === "/icons/icon-512.png" && icon.sizes === "512x512" && icon.type === "image/png"));
  assert.ok(manifest.icons.some((icon) => icon.purpose?.includes("maskable")));
  assert.ok(manifest.shortcuts?.every((shortcut) => shortcut.icons?.some((icon) => icon.src === "/icons/icon-192.png" && icon.type === "image/png")));
  assert.ok(manifest.screenshots?.length >= 2);
  const screenshotSources = manifest.screenshots.map((screenshot) => screenshot.src);
  assert.deepEqual(screenshotSources, ["/screenshots/real-mobile-chat.jpg", "/screenshots/real-mobile-device.jpg"]);
  assert.ok(manifest.screenshots.every((screenshot) => screenshot.sizes === "390x844"));
  assert.ok(manifest.screenshots.every((screenshot) => screenshot.type === "image/jpeg"));
  assert.ok(manifest.screenshots.every((screenshot) => screenshot.form_factor === "narrow"));
  assert.ok(manifest.screenshots.every((screenshot) => screenshot.label));

  const dynamicManifestResponse = await request(port, "/manifest.webmanifest?pairingToken=bind_install_demo_123");
  assert.equal(dynamicManifestResponse.status, 200);
  assert.match(dynamicManifestResponse.headers.get("content-type") || "", /json|manifest/);
  assert.match(dynamicManifestResponse.headers.get("cache-control") || "", /no-store/);
  const dynamicManifest = await dynamicManifestResponse.json();
  assert.equal(dynamicManifest.id, "/mobile/chat");
  assert.equal(dynamicManifest.start_url, "/mobile/install/bind_install_demo_123");
  assert.equal(dynamicManifest.shortcuts.find((shortcut) => shortcut.short_name === "绑定")?.url, "/mobile/install/bind_install_demo_123");
  assert.ok(dynamicManifest.icons.some((icon) => icon.src === "/icons/icon-512.png" && icon.type === "image/png"));

  const invalidDynamicManifestResponse = await request(port, "/manifest.webmanifest?pairingToken=not-secret");
  assert.match(invalidDynamicManifestResponse.headers.get("cache-control") || "", /no-cache/);
  const invalidDynamicManifest = await invalidDynamicManifestResponse.json();
  assert.equal(invalidDynamicManifest.start_url, "/mobile/chat");

  for (const screenshot of manifest.screenshots) {
    const screenshotResponse = await request(port, screenshot.src);
    assert.equal(screenshotResponse.status, 200);
    assert.match(screenshotResponse.headers.get("content-type") || "", /jpeg|image/);
    const bytes = new Uint8Array(await screenshotResponse.arrayBuffer());
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    assert.equal(bytes[bytes.length - 2], 0xff);
    assert.equal(bytes[bytes.length - 1], 0xd9);
  }

  for (const icon of ["/icons/icon-192.png", "/icons/icon-512.png"]) {
    const iconResponse = await request(port, icon);
    assert.equal(iconResponse.status, 200);
    assert.match(iconResponse.headers.get("content-type") || "", /png|image/);
  }

  const serviceWorkerResponse = await request(port, "/sw.js");
  assert.equal(serviceWorkerResponse.status, 200);
  assert.match(serviceWorkerResponse.headers.get("content-type") || "", /javascript/);
  const serviceWorker = await serviceWorkerResponse.text();
  assert.match(serviceWorker, /lifeos-ai-shell-v\d+/);
  assert.match(serviceWorker, /SHELL_ASSETS/);
  assert.match(serviceWorker, /extractBuildAssets/);
  assert.match(serviceWorker, /cacheBuildAssets/);
  assert.match(serviceWorker, /html\.match\(/);
  assert.match(serviceWorker, /assets/);
  assert.match(serviceWorker, /fetch\("\/", \{ cache: "no-store" \}\)/);
  assert.match(serviceWorker, /cache\.addAll\(buildAssets\)/);
  assert.match(serviceWorker, /\/mobile\/chat/);
  assert.match(serviceWorker, /\/mobile\/device/);
  assert.match(serviceWorker, /\/mobile\/actions/);
  assert.match(serviceWorker, /OFFLINE_FALLBACK/);
  assert.match(serviceWorker, /\/offline\.html/);
  assert.match(serviceWorker, /\/screenshots\/real-mobile-chat\.jpg/);
  assert.match(serviceWorker, /\/screenshots\/real-mobile-device\.jpg/);
  assert.match(serviceWorker, /\/icons\/icon-192\.png/);
  assert.match(serviceWorker, /\/icons\/icon-512\.png/);
  assert.match(serviceWorker, /lifeos-offline-queue/);
  assert.match(serviceWorker, /LIFEOS_SYNC_OFFLINE_QUEUE/);
  assert.match(serviceWorker, /LIFEOS_SKIP_WAITING/);
  assert.match(serviceWorker, /if \(!response\.ok\) return response;/);

  const mainSource = await readFile(path.join(rootDir, "src", "main.tsx"), "utf8");
  assert.match(mainSource, /controllerchange/);
  assert.match(mainSource, /window\.location\.reload\(\)/);
  assert.match(mainSource, /registration\.update\(\)/);
  assert.match(mainSource, /LIFEOS_SKIP_WAITING/);

  const indexHtmlSource = await readFile(path.join(rootDir, "index.html"), "utf8");
  assert.match(indexHtmlSource, /apple-mobile-web-app-capable/);
  assert.match(indexHtmlSource, /apple-touch-icon" sizes="192x192" href="\/icons\/icon-192\.png"/);
  assert.match(indexHtmlSource, /apple-touch-icon" sizes="512x512" href="\/icons\/icon-512\.png"/);

  const appSource = await readFile(path.join(rootDir, "src", "App.tsx"), "utf8");
  assert.match(appSource, /useOfflineQueueSync\(flushOfflineMessages\)/);
  assert.match(appSource, /resolveChatStateChanges\(stateChanges\)/);
  assert.match(appSource, /loadStoredChatMessages/);
  assert.match(appSource, /persistStoredChatMessages/);
  assert.doesNotMatch(appSource, /localStorage\.getItem\("lifeos_messages"/);
  assert.doesNotMatch(appSource, /localStorage\.setItem\("lifeos_messages"/);

  const chatMessageStorageSource = await readFile(path.join(rootDir, "src", "services", "chatMessageStorage.ts"), "utf8");
  assert.match(chatMessageStorageSource, /parseStoredChatMessages/);
  assert.match(chatMessageStorageSource, /defaultChatMessages/);
  assert.match(chatMessageStorageSource, /catch/);

  const chatPersistenceSource = await readFile(path.join(rootDir, "src", "hooks", "useChatPersistence.ts"), "utf8");
  const chatSessionStorageSource = await readFile(path.join(rootDir, "src", "services", "chatSessionStorage.ts"), "utf8");
  const lifeosApiSource = await readFile(path.join(rootDir, "src", "services", "lifeosApi.ts"), "utf8");
  assert.match(chatPersistenceSource, /loadActiveChatSessionId/);
  assert.match(chatPersistenceSource, /saveActiveChatSessionId/);
  assert.doesNotMatch(chatPersistenceSource, /localStorage\.(getItem|setItem)\("lifeos_active_chat_session_id"/);
  assert.match(chatSessionStorageSource, /ACTIVE_CHAT_SESSION_STORAGE_KEY/);
  assert.match(chatSessionStorageSource, /catch/);
  assert.match(lifeosApiSource, /clearActiveChatSessionId/);
  assert.doesNotMatch(lifeosApiSource, /localStorage\.removeItem\("lifeos_active_chat_session_id"/);

  const offlineQueueSyncHookSource = await readFile(path.join(rootDir, "src", "hooks", "useOfflineQueueSync.ts"), "utf8");
  assert.match(offlineQueueSyncHookSource, /offlineQueueSummary\.nextRetryAt/);
  assert.match(offlineQueueSyncHookSource, /window\.setTimeout\(\(\) => \{\s*void syncQueuedMessages\(\);/);

  const chatStateChangesSource = await readFile(path.join(rootDir, "src", "services", "chatStateChanges.ts"), "utf8");
  assert.match(chatStateChangesSource, /OPEN_APP/);
  assert.match(chatStateChangesSource, /REQUEST_APP_GENERATION/);
  assert.match(chatStateChangesSource, /widgetArgKeys/);

  const loginSource = await readFile(path.join(rootDir, "src", "pages", "admin", "AdminLoginPage.tsx"), "utf8");
  assert.match(loginSource, /onboardingRequired/);
  assert.match(loginSource, /session\.nextPath/);

  const onboardingSource = await readFile(path.join(rootDir, "src", "pages", "admin", "AdminOnboardingPage.tsx"), "utf8");
  assert.match(onboardingSource, /getOnboardingStatus/);
  assert.match(onboardingSource, /completeOnboarding/);
  assert.match(onboardingSource, /getBackupSchedule/);
  assert.match(onboardingSource, /updateBackupSchedule/);
  assert.match(onboardingSource, /updateActiveAiProvider/);
  assert.match(onboardingSource, /开启每日自动备份/);
  assert.match(onboardingSource, /backupSchedule\.nextRunAt/);
  assert.match(onboardingSource, /默认聊天 Provider/);
  assert.match(onboardingSource, /设为默认聊天 Provider/);
  assert.match(onboardingSource, /已设为默认聊天 Provider/);
  assert.match(onboardingSource, /打开连接向导/);
  assert.match(onboardingSource, /\/admin\/settings#mobile-connect/);
  assert.match(onboardingSource, /完成首次启动向导/);
  assert.match(onboardingSource, /completedSteps} \/ 4/);
  const mobileChatSource = await readFile(path.join(rootDir, "src", "pages", "mobile", "MobileChatPage.tsx"), "utf8");
  assert.match(mobileChatSource, /没有扫成功时，粘贴电脑端绑定链接/);
  assert.match(mobileChatSource, /使用绑定链接/);
  assert.match(mobileChatSource, /bind_ 开头的绑定 token/);
  assert.match(mobileChatSource, /consumePendingPairingToken/);
  assert.match(mobileChatSource, /peekPendingPairingToken/);
  assert.match(mobileChatSource, /recoveringPairingIntent/);
  assert.match(mobileChatSource, /正在恢复添加到桌面时保存的绑定信息/);
  assert.match(mobileChatSource, /launchPairingToken/);
  assert.match(mobileChatSource, /setPairingManifestToken/);
  assert.match(mobileChatSource, /pairingInstallPath/);
  assert.match(mobileChatSource, /pairingToken/);
  assert.doesNotMatch(mobileChatSource, /window\.location\.replace\(`\/mobile\/pair\?token=/);
  assert.doesNotMatch(mobileChatSource, /href="\/mobile\/pair"/);

  const mobilePairSource = await readFile(path.join(rootDir, "src", "pages", "mobile", "MobilePairPage.tsx"), "utf8");
  assert.match(mobilePairSource, /setPairingManifestToken/);
  assert.match(mobilePairSource, /consumePendingPairingToken/);
  assert.match(mobilePairSource, /pairingInstallPath/);
  assert.match(mobilePairSource, /history\.replaceState/);
  assert.doesNotMatch(mobilePairSource, /window\.location\.replace\(`\/mobile\/pair\?token=/);
  assert.match(mobilePairSource, /保存 24 小时/);
  assert.match(mobilePairSource, /自动恢复到确认绑定页/);
  assert.match(mobilePairSource, /设备凭证已经保存/);

  const mobileDeviceSource = await readFile(path.join(rootDir, "src", "pages", "mobile", "MobileDevicePage.tsx"), "utf8");
  assert.match(mobileDeviceSource, /getPwaCapabilityStatus/);
  assert.match(mobileDeviceSource, /PWA 安装与后台同步/);
  assert.match(mobileDeviceSource, /Service Worker/);
  assert.match(mobileDeviceSource, /Background Sync/);
  assert.match(mobileDeviceSource, /IndexedDB/);
  assert.match(mobileDeviceSource, /pwaCapabilities\.recommendations/);

  const pwaCapabilitiesSource = await readFile(path.join(rootDir, "src", "services", "pwaCapabilities.ts"), "utf8");
  assert.match(pwaCapabilitiesSource, /serviceWorkerControlled/);
  assert.match(pwaCapabilitiesSource, /backgroundSyncSupported/);
  assert.match(pwaCapabilitiesSource, /indexedDbSupported/);
  assert.match(pwaCapabilitiesSource, /绑定成功后添加到主屏幕/);
  assert.match(pwaCapabilitiesSource, /后台同步不可用/);

  const sensitiveMainSource = await readFile(path.join(rootDir, "src", "main.tsx"), "utf8");
  assert.match(sensitiveMainSource, /clearSensitiveLocalStorageResidue/);

  const sensitiveLocalStorageSource = await readFile(path.join(rootDir, "src", "services", "sensitiveLocalStorage.ts"), "utf8");
  assert.match(sensitiveLocalStorageSource, /failedKeys/);
  assert.match(sensitiveLocalStorageSource, /try \{/);
  assert.match(sensitiveLocalStorageSource, /Some browser modes expose localStorage/);

  const syncedStateSource = await readFile(path.join(rootDir, "src", "hooks", "useSyncedClientState.ts"), "utf8");
  assert.match(syncedStateSource, /isSensitiveLocalStorageKey/);
  assert.match(syncedStateSource, /localStorage\.removeItem\(key\)/);
  assert.match(syncedStateSource, /!isSensitiveLocalStorageKey\(key\)/);
  assert.match(syncedStateSource, /export function readLocalState/);
  assert.match(syncedStateSource, /export function writeLocalState/);
  assert.match(syncedStateSource, /typeof localStorage === "undefined"/);
  assert.match(syncedStateSource, /Local cache is best-effort/);

  const studioConnectionSource = await readFile(path.join(rootDir, "src", "components", "apps", "studio", "useStudioConnectionSettings.ts"), "utf8");
  assert.doesNotMatch(studioConnectionSource, /useSyncedClientState\("lifeos_proxy_url"/);
  assert.match(studioConnectionSource, /clearSensitiveLocalStorageResidue/);
  assert.match(studioConnectionSource, /summarizeProxySubscriptionUrl/);
  assert.match(studioConnectionSource, /setProxyUrl\(""\)/);

  const studioAppSource = await readFile(path.join(rootDir, "src", "components", "apps", "StudioApp.tsx"), "utf8");
  assert.match(studioAppSource, /useStudioSimulatorState\(\)/);

  const studioSimulatorSource = await readFile(path.join(rootDir, "src", "components", "apps", "studio", "useStudioSimulatorState.ts"), "utf8");
  assert.match(studioSimulatorSource, /jarvis-sandbox-frame-log/);
  assert.match(studioSimulatorSource, /setRefineHistory\(\(prev\) => \[version, \.\.\.prev\]\.slice\(0, 10\)\)/);
  assert.match(studioSimulatorSource, /setSimulatorLogs\(\(prev\) => \[\.\.\.prev, log\]\.slice\(-6\)\)/);

  assert.match(mobileDeviceSource, /retryOfflineMessage/);
  assert.match(mobileDeviceSource, /removeOfflineMessages/);
  assert.match(mobileDeviceSource, /pairingInstallPath/);
  assert.doesNotMatch(mobileDeviceSource, /window\.location\.href = `\/mobile\/pair\?token=/);
  assert.match(mobileDeviceSource, /getOfflineMessageQueueStorageStatus/);
  assert.match(mobileDeviceSource, /MobileOfflineQueueCards/);
  assert.match(mobileDeviceSource, /clearOfflineMessageQueue/);

  assert.match(mobileDeviceSource, /删除这条离线消息/);
  assert.match(mobileDeviceSource, /清空离线消息队列/);
  assert.match(mobileDeviceSource, /粘贴电脑端绑定链接/);
  assert.match(mobileDeviceSource, /清除旧凭证并重新绑定/);
  assert.match(mobileDeviceSource, /revokeCurrentDeviceBinding/);
  assert.match(mobileDeviceSource, /解除并撤销绑定/);
  assert.match(mobileDeviceSource, /bind_ 开头的绑定 token/);
  assert.match(mobileDeviceSource, /设备凭证存储/);
  assert.match(mobileDeviceSource, /IndexedDB/);
  assert.match(mobileDeviceSource, /localStorage 旧凭证/);
  assert.doesNotMatch(mobileDeviceSource, /href="\/mobile\/pair"/);

  const mobileOfflineQueueCardsSource = await readFile(path.join(rootDir, "src", "pages", "mobile", "MobileOfflineQueueCards.tsx"), "utf8");
  assert.match(mobileOfflineQueueCardsSource, /getOfflineMessageStatusLabel/);
  assert.match(mobileOfflineQueueCardsSource, /getOfflineMessageRetryLabel/);
  assert.match(mobileOfflineQueueCardsSource, /getOfflineMessageQueueStorageLabel/);
  assert.match(mobileOfflineQueueCardsSource, /getOfflineMessageQueueUsageLabel/);
  assert.match(mobileOfflineQueueCardsSource, /离线队列存储/);
  assert.match(mobileOfflineQueueCardsSource, /localStorage 兼容镜像/);
  assert.match(mobileOfflineQueueCardsSource, /持久化存储/);
  assert.match(mobileOfflineQueueCardsSource, /失败原因/);
  assert.match(mobileOfflineQueueCardsSource, /单条重试/);

  const offlineQueueBannerSource = await readFile(path.join(rootDir, "src", "components", "chat", "OfflineQueueBanner.tsx"), "utf8");
  assert.match(offlineQueueBannerSource, /getOfflineMessageStatusLabel/);
  assert.match(offlineQueueBannerSource, /getOfflineMessageRetryLabel/);
  assert.doesNotMatch(offlineQueueBannerSource, /\{item\.status\}/);

  const offlineQueueSource = await readFile(path.join(rootDir, "src", "services", "offlineMessageQueue.ts"), "utf8");
  assert.match(offlineQueueSource, /getOfflineMessageStatusLabel/);
  assert.match(offlineQueueSource, /getOfflineMessageRetryLabel/);
  assert.match(offlineQueueSource, /getOfflineMessageQueueStorageStatus/);
  assert.match(offlineQueueSource, /formatOfflineMessageQueueBytes/);
  assert.match(offlineQueueSource, /getOfflineMessageQueueStorageLabel/);
  assert.match(offlineQueueSource, /getOfflineMessageQueueUsageLabel/);
  assert.match(offlineQueueSource, /IndexedDB 主存储/);
  assert.match(offlineQueueSource, /hydrateOfflineMessageQueue/);
  assert.match(offlineQueueSource, /writeIndexedQueue/);
  assert.match(offlineQueueSource, /persistentStorageGranted/);
  assert.match(offlineQueueSource, /浏览器存储空间接近上限/);
  assert.match(offlineQueueSource, /可立即重试/);

  const mobileActionsSource = await readFile(path.join(rootDir, "src", "components", "apps", "SystemActionsApp.tsx"), "utf8");
  assert.match(mobileActionsSource, /已记录 \{actionLogs\.length\} 条/);
  assert.match(mobileActionsSource, /actionLogSummary/);
  assert.match(mobileActionsSource, /ActionMetric/);
  assert.match(mobileActionsSource, /清空记录/);
  assert.match(mobileActionsSource, /高风险/);
  assert.match(mobileActionsSource, /最近执行记录/);
  assert.match(mobileActionsSource, /来源：\{latestActionLog\.source\}/);
  assert.match(mobileActionsSource, /Scheme：\{latestActionLog\.scheme\}/);
  assert.match(mobileActionsSource, /风险：\{riskLabel\(latestActionLog\.risk\)\}/);
  assert.match(mobileActionsSource, /loadAllowedUrlSchemes/);
  assert.match(mobileActionsSource, /writeSystemActionStorage/);
  assert.doesNotMatch(mobileActionsSource, /localStorage\.getItem\("lifeos_allowed_url_schemes"/);
  assert.doesNotMatch(mobileActionsSource, /localStorage\.setItem\("lifeos_system_actions"/);

  const systemActionStorageSource = await readFile(path.join(rootDir, "src", "services", "systemActionStorage.ts"), "utf8");
  assert.match(systemActionStorageSource, /loadSavedSystemActions/);
  assert.match(systemActionStorageSource, /loadSystemActionLogs/);
  assert.match(systemActionStorageSource, /normalizeSystemActionLog/);
  assert.match(systemActionStorageSource, /catch/);

  const connectionGuideSource = await readFile(path.join(rootDir, "src", "pages", "admin", "ConnectionGuide.tsx"), "utf8");
  assert.match(connectionGuideSource, /id="mobile-connect"/);
  assert.match(connectionGuideSource, /推荐绑定地址/);
  assert.match(connectionGuideSource, /推荐启动环境/);
  assert.match(connectionGuideSource, /recommended-env/);
  assert.match(connectionGuideSource, /复制推荐启动环境/);
  assert.match(connectionGuideSource, /connectionCandidates/);
  assert.match(connectionGuideSource, /需重启生效/);
  assert.match(connectionGuideSource, /复制手机入口/);
  assert.match(connectionGuideSource, /手机端入口/);
  assert.match(connectionGuideSource, /mobile\/install/);
  assert.doesNotMatch(connectionGuideSource, /copyText\("recommended-pair"/);
  assert.doesNotMatch(connectionGuideSource, /copyText\(candidate\.id, candidate\.mobilePairUrl\)/);
  assert.match(connectionGuideSource, /candidate\.envTemplate/);
  assert.match(connectionGuideSource, /candidate\.restartInstruction/);
  assert.match(connectionGuideSource, /复制启动环境/);
  assert.match(connectionGuideSource, /saveDesktopConnectionConfig/);
  assert.match(connectionGuideSource, /保存到桌面启动配置/);
  assert.match(connectionGuideSource, /安装包用户/);
  assert.match(connectionGuideSource, /退出并重新打开 LifeOS AI/);
  assert.match(connectionGuideSource, /desktopRuntimeConfig/);

  const devicePairSource = await readFile(path.join(rootDir, "src", "pages", "admin", "DevicePairPage.tsx"), "utf8");
  assert.match(devicePairSource, /connectionCandidates/);
  assert.match(devicePairSource, /testConnectionUrl/);
  assert.match(devicePairSource, /测试当前绑定地址/);
  assert.match(devicePairSource, /推荐安全/);
  assert.match(devicePairSource, /仅可信网络/);
  assert.match(devicePairSource, /需重启生效/);
  assert.match(devicePairSource, /activeCandidate\.envTemplate/);
  assert.match(devicePairSource, /activeCandidate\.restartInstruction/);
  assert.match(devicePairSource, /copiedEnv/);
  assert.match(devicePairSource, /复制当前绑定启动环境/);
  assert.match(devicePairSource, /重启后生效/);

  const adminDashboardSource = await readFile(path.join(rootDir, "src", "pages", "admin", "AdminDashboardPage.tsx"), "utf8");
  assert.match(adminDashboardSource, /公网\/异地访问存在待处理风险/);
  assert.match(adminDashboardSource, /health\.publicRisk\.items\.map/);
  assert.match(adminDashboardSource, /打开安全设置/);
  assert.match(adminDashboardSource, /立即创建备份/);
  assert.match(adminDashboardSource, /开启自动备份/);
  assert.match(adminDashboardSource, /\/admin\/settings#backup-schedule/);
  assert.match(adminDashboardSource, /previewBackup/);
  assert.match(adminDashboardSource, /恢复前预览/);
  assert.match(adminDashboardSource, /恢复风险说明/);
  assert.match(adminDashboardSource, /普通备份已排除敏感密钥/);
  assert.match(adminDashboardSource, /buildRestoreConfirmMessage/);

  const configDiagnosticsPanelSource = await readFile(path.join(rootDir, "src", "pages", "admin", "settings", "ConfigDiagnosticsPanel.tsx"), "utf8");
  assert.match(configDiagnosticsPanelSource, /发布包/);
  assert.match(configDiagnosticsPanelSource, /diagnostics\.release\.manifestAvailable/);
  assert.match(configDiagnosticsPanelSource, /diagnostics\.release\.checksumAvailable/);
  assert.match(configDiagnosticsPanelSource, /latestArtifact/);
  assert.match(configDiagnosticsPanelSource, /backupSchedule\.enabled/);
  assert.match(configDiagnosticsPanelSource, /自动备份/);

  const backupRestorePanelSource = await readFile(path.join(rootDir, "src", "pages", "admin", "settings", "BackupRestorePanel.tsx"), "utf8");
  assert.match(backupRestorePanelSource, /id="backup-schedule"/);
  assert.match(backupRestorePanelSource, /previewDataCleanup/);
  assert.match(backupRestorePanelSource, /预览清理/);
  assert.match(backupRestorePanelSource, /cleanupPreview/);
  assert.match(backupRestorePanelSource, /buildCleanupConfirmMessage/);
  assert.match(backupRestorePanelSource, /BackupPreviewCard/);
  assert.match(backupRestorePanelSource, /BackupList/);

  const backupListSource = await readFile(path.join(rootDir, "src", "pages", "admin", "settings", "BackupList.tsx"), "utf8");
  assert.match(backupListSource, /还没有备份/);
  assert.match(backupListSource, /backupDownloadUrl\(backup\.file\)/);
  assert.match(backupListSource, /onPreview\(backup\)/);
  assert.match(backupListSource, /onRestore\(backup\)/);

  const backupPreviewCardSource = await readFile(path.join(rootDir, "src", "pages", "admin", "settings", "BackupPreviewCard.tsx"), "utf8");
  assert.match(backupPreviewCardSource, /备份预览：/);
  assert.match(backupPreviewCardSource, /preview\.tables/);
  assert.match(backupPreviewCardSource, /普通备份已排除敏感密钥/);
  assert.match(backupPreviewCardSource, /恢复风险说明/);

  const backupRestoreUiSource = await readFile(path.join(rootDir, "src", "services", "backupRestoreUi.ts"), "utf8");
  assert.match(backupRestoreUiSource, /备份预览：/);
  assert.match(backupRestoreUiSource, /预计删除/);
  assert.match(backupRestoreUiSource, /formatCleanupSummary/);

  const aiKeyPanelSource = await readFile(path.join(rootDir, "src", "pages", "admin", "settings", "AiKeyPanel.tsx"), "utf8");
  const chatRuntimeSettingsSource = await readFile(path.join(rootDir, "src", "services", "chatRuntimeSettings.ts"), "utf8");
  const aiRuntimeSource = await readFile(path.join(rootDir, "src", "services", "aiRuntime.ts"), "utf8");
  assert.match(aiKeyPanelSource, /listAiProviders/);
  assert.match(aiKeyPanelSource, /saveAiProviderKey/);
  assert.match(aiKeyPanelSource, /updateActiveAiProvider/);
  assert.match(aiKeyPanelSource, /updateAiProviderModel/);
  assert.match(aiKeyPanelSource, /testAiProvider/);
  assert.match(aiKeyPanelSource, /Google Gemini API Key/);
  assert.match(aiKeyPanelSource, /Responses \/ Chat Completions/);
  assert.match(aiKeyPanelSource, /多模型聚合路由/);
  assert.match(aiKeyPanelSource, /Ollama \/ LM Studio endpoint/);
  assert.match(aiKeyPanelSource, /系统安全存储不可用/);
  assert.match(aiKeyPanelSource, /当前保存位置/);
  assert.match(aiKeyPanelSource, /优先策略/);
  assert.match(aiKeyPanelSource, /默认聊天 Provider/);
  assert.match(aiKeyPanelSource, /设为默认聊天 Provider/);
  assert.match(aiKeyPanelSource, /重新保存一次可迁移到系统安全存储/);
  assert.match(chatRuntimeSettingsSource, /lifeos_active_ai_provider/);
  assert.match(chatRuntimeSettingsSource, /providerId/);
  assert.match(chatRuntimeSettingsSource, /readLocalRuntimeValue/);
  assert.match(chatRuntimeSettingsSource, /lifeos_proxy_nodes/);
  assert.doesNotMatch(chatRuntimeSettingsSource, /getClientState\("[^"]+", localStorage\.getItem/);
  assert.match(aiRuntimeSource, /providerId\?: string/);
});

test("development server injects pairing manifest before Vite serves mobile install pages", async (t) => {
  const port = await getOpenPort();
  const dataDir = await mkdtemp(path.join(tmpdir(), "lifeos-frontend-dev-smoke-"));
  const child = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: "development",
      LIFEOS_PORT: String(port),
      LIFEOS_DATA_DIR: dataDir,
      LIFEOS_HOST: "127.0.0.1",
      PUBLIC_BASE_URL: "",
      APP_URL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const childOutput = [];
  child.stdout.on("data", (chunk) => childOutput.push(chunk.toString()));
  child.stderr.on("data", (chunk) => childOutput.push(chunk.toString()));

  t.after(async () => {
    await stopServer(child);
    await rm(dataDir, { recursive: true, force: true });
  });

  await waitForServer(port, child, childOutput);

  const pairResponse = await request(port, "/mobile/pair?token=bind_dev_install_pair_123");
  assert.equal(pairResponse.status, 200);
  assert.match(pairResponse.headers.get("cache-control") || "", /no-store/);
  assert.match(pairResponse.headers.get("set-cookie") || "", /lifeos_pairing_intent=bind_dev_install_pair_123/);
  const pairHtml = await pairResponse.text();
  assert.match(pairHtml, /href="\/manifest\.webmanifest\?pairingToken=bind_dev_install_pair_123"/);

  const chatResponse = await request(port, "/mobile/chat?pairingToken=bind_dev_install_chat_123");
  assert.equal(chatResponse.status, 200);
  assert.match(chatResponse.headers.get("cache-control") || "", /no-store/);
  assert.match(chatResponse.headers.get("set-cookie") || "", /lifeos_pairing_intent=bind_dev_install_chat_123/);
  const chatHtml = await chatResponse.text();
  assert.match(chatHtml, /href="\/manifest\.webmanifest\?pairingToken=bind_dev_install_chat_123"/);

  const installPathResponse = await request(port, "/mobile/install/bind_dev_install_path_123");
  assert.equal(installPathResponse.status, 200);
  assert.match(installPathResponse.headers.get("cache-control") || "", /no-store/);
  assert.match(installPathResponse.headers.get("set-cookie") || "", /lifeos_pairing_intent=bind_dev_install_path_123/);
  const installPathHtml = await installPathResponse.text();
  assert.match(installPathHtml, /href="\/manifest\.webmanifest\?pairingToken=bind_dev_install_path_123"/);
});
