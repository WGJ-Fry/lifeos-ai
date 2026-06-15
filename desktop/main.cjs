const { app, BrowserWindow, Menu, Tray, clipboard, dialog, nativeImage, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

let mainWindow;
let tray;
let trayRefreshTimer;
let serverPort = 3000;
let desktopLogPath = "";
let desktopShellStatus = {
  core: "starting",
  coreLabel: "本地核心启动中",
  adminLabel: "管理员状态未知",
  aiLabel: "AI 状态未知",
  deviceLabel: "设备状态未知",
  url: "",
  updatedAt: null,
};
const chromiumUnsafePorts = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110,
  111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532,
  540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061, 6000,
  6566, 6665, 6666, 6667, 6668, 6669, 6697, 10080,
]);

if (process.env.LIFEOS_DESKTOP_USER_DATA_DIR) {
  app.setPath("userData", path.resolve(process.env.LIFEOS_DESKTOP_USER_DATA_DIR));
}

function writeDesktopLog(message, details) {
  const line = `[${new Date().toISOString()}] ${message}${details ? ` ${details}` : ""}\n`;
  if (!desktopLogPath) {
    console.log(line.trim());
    return;
  }
  fs.mkdirSync(path.dirname(desktopLogPath), { recursive: true });
  fs.appendFileSync(desktopLogPath, line);
}

function localUrl(pathname = "/admin/login") {
  return `http://127.0.0.1:${serverPort}${pathname}`;
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findOpenPort(startPort) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      if (chromiumUnsafePorts.has(port)) {
        tryPort(port + 1);
        return;
      }
      const tester = net.createServer();
      tester.once("error", () => tryPort(port + 1));
      tester.once("listening", () => {
        tester.close(() => resolve(port));
      });
      tester.listen(port, "127.0.0.1");
    };
    tryPort(startPort);
  });
}

function normalizeDesktopRuntimeConfig(config) {
  if (!config || typeof config !== "object") return null;
  const mode = String(config.mode || "");
  if (!["configured", "cloudflare", "tailscale", "lan", "local"].includes(mode)) return null;
  const host = config.host === "0.0.0.0" ? "0.0.0.0" : "127.0.0.1";
  const port = Number.parseInt(String(config.port || ""), 10);
  const publicBaseUrl = String(config.publicBaseUrl || "").trim();
  return {
    mode,
    host,
    port: Number.isFinite(port) && port >= 1024 && port <= 65535 ? port : 3000,
    publicBaseUrl: /^https?:\/\//i.test(publicBaseUrl) ? publicBaseUrl : "",
    allowPublic: Boolean(config.allowPublic),
  };
}

function applyDesktopRuntimeConfig() {
  const configPath = path.join(app.getPath("userData"), "data", "desktop-runtime-config.json");
  if (!fs.existsSync(configPath)) return null;
  try {
    const config = normalizeDesktopRuntimeConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));
    if (!config) return null;
    process.env.LIFEOS_HOST = process.env.LIFEOS_HOST || config.host;
    process.env.LIFEOS_PORT = process.env.LIFEOS_PORT || String(config.port);
    if (config.publicBaseUrl && !process.env.PUBLIC_BASE_URL && !process.env.APP_URL) {
      process.env.PUBLIC_BASE_URL = config.publicBaseUrl;
    }
    if (config.allowPublic && !process.env.LIFEOS_ALLOW_PUBLIC) {
      process.env.LIFEOS_ALLOW_PUBLIC = "1";
    }
    writeDesktopLog("Loaded desktop runtime config", `mode=${config.mode} host=${process.env.LIFEOS_HOST} port=${process.env.LIFEOS_PORT || ""} publicBaseUrlConfigured=${Boolean(process.env.PUBLIC_BASE_URL || process.env.APP_URL)}`);
    return config;
  } catch (error) {
    writeDesktopLog("Failed to load desktop runtime config", error?.message || String(error));
    return null;
  }
}

function waitForHealth(port, attempts = 60) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      const req = http.get(`http://127.0.0.1:${port}/api/v1/health`, (res) => {
        if (res.statusCode === 200) {
          res.resume();
          resolve(true);
          return;
        }
        res.resume();
        retry(remaining);
      });
      req.on("error", () => retry(remaining));
    };

    const retry = (remaining) => {
      if (remaining <= 0) {
        reject(new Error("LifeOS local server did not start in time."));
        return;
      }
      setTimeout(() => check(remaining - 1), 250);
    };

    check(attempts);
  });
}

async function startLocalCore() {
  desktopLogPath = path.join(app.getPath("logs"), "lifeos-desktop.log");
  process.env.LIFEOS_DATA_DIR = path.join(app.getPath("userData"), "data");
  applyDesktopRuntimeConfig();
  serverPort = await findOpenPort(Number(process.env.LIFEOS_PORT || 3000));
  process.env.NODE_ENV = "production";
  process.env.LIFEOS_PORT = String(serverPort);
  process.env.LIFEOS_DEVICE_NAME = process.env.LIFEOS_DEVICE_NAME || `${app.getName()} Desktop`;

  const appPath = app.isPackaged ? app.getAppPath() : process.cwd();
  const runtimeCwd = app.isPackaged ? path.dirname(appPath) : appPath;
  process.chdir(runtimeCwd);
  writeDesktopLog("Starting LifeOS local core", `port=${serverPort} dataDirConfigured=${Boolean(process.env.LIFEOS_DATA_DIR)} packaged=${app.isPackaged}`);
  if (process.env.LIFEOS_DESKTOP_FORCE_CORE_FAILURE === "1") {
    throw new Error("Forced desktop startup failure for smoke testing.");
  }
  require(path.join(appPath, "dist", "server.cjs"));
  await waitForHealth(serverPort);
  writeDesktopLog("LifeOS local core is healthy", localUrl("/api/v1/health"));
}

function showMainWindow(pathname = "/admin/login") {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow(pathname);
    return;
  }
  mainWindow.loadURL(localUrl(pathname));
  mainWindow.show();
  mainWindow.focus();
}

function createWindow(pathname = "/admin/login") {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: "LifeOS AI",
    backgroundColor: "#060a10",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  return mainWindow.loadURL(localUrl(pathname));
}

function openLogsFolder() {
  shell.openPath(path.dirname(desktopLogPath)).catch((error) => {
    writeDesktopLog("Failed to open logs folder", error?.message || String(error));
  });
}

function redactDiagnosticText(value) {
  return String(value)
    .replace(/(lifeos_admin_session|lifeos_csrf|authorization|cookie|token|api[-_]?key|password|secret)=?[^\s,;"]*/gi, "$1=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, "Bearer [redacted]")
    .replace(/dataDir=[^\s,;"]+/gi, "dataDir=[redacted]")
    .replace(/\/Users\/[^\s,;"]+/g, "[local-path]")
    .replace(/[A-Za-z]:\\[^\s,;"]+/g, "[local-path]");
}

function readLogTail(maxLines = 80) {
  if (!desktopLogPath || !fs.existsSync(desktopLogPath)) return [];
  return fs.readFileSync(desktopLogPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-maxLines)
    .map(redactDiagnosticText);
}

function fetchLocalJson(pathname) {
  return new Promise((resolve) => {
    const req = http.get(localUrl(pathname), (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > 200_000) req.destroy(new Error("response too large"));
      });
      res.on("end", () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode || 0,
            body: body ? JSON.parse(body) : null,
          });
        } catch (error) {
          resolve({ ok: false, status: res.statusCode || 0, error: "invalid json" });
        }
      });
    });
    req.setTimeout(1500, () => req.destroy(new Error("timeout")));
    req.on("error", (error) => resolve({ ok: false, status: 0, error: error?.message || "request failed" }));
  });
}

function publicHealthSnapshot(health) {
  if (!health || typeof health !== "object") return null;
  return {
    ok: Boolean(health.ok),
    service: health.service || "",
    version: health.version || "",
    deviceCount: Number.isFinite(Number(health.deviceCount)) ? Number(health.deviceCount) : 0,
    onlineDeviceCount: Number.isFinite(Number(health.onlineDeviceCount)) ? Number(health.onlineDeviceCount) : 0,
    aiConfigured: Boolean(health.aiConfigured),
    adminConfigured: Boolean(health.adminConfigured),
    host: health.host || "",
    networkMode: health.networkMode || "",
    publicBaseUrlConfigured: Boolean(health.publicBaseUrl),
    publicAccessWarning: Boolean(health.publicAccessWarning),
    publicAccessAllowed: Boolean(health.publicAccessAllowed),
    publicSetupRisk: Boolean(health.publicSetupRisk),
    timestamp: health.timestamp || null,
  };
}

function publicAdminStatusSnapshot(status) {
  if (!status || typeof status !== "object") return null;
  return {
    configured: Boolean(status.configured),
    authenticated: Boolean(status.authenticated),
    envManaged: Boolean(status.envManaged),
    onboardingRequired: status.onboardingRequired === null || status.onboardingRequired === undefined ? null : Boolean(status.onboardingRequired),
    nextPath: typeof status.nextPath === "string" ? status.nextPath : null,
  };
}

function summarizeDesktopShellStatus(health, adminStatus) {
  const deviceCount = Number.isFinite(Number(health?.deviceCount)) ? Number(health.deviceCount) : 0;
  const onlineDeviceCount = Number.isFinite(Number(health?.onlineDeviceCount)) ? Number(health.onlineDeviceCount) : 0;
  const adminLabel = adminStatus?.configured
    ? adminStatus.onboardingRequired
      ? "首次启动向导待完成"
      : "管理员已设置"
    : "管理员未设置";
  return {
    core: health?.ok ? "healthy" : "unreachable",
    coreLabel: health?.ok ? `本地核心正常 · ${health.networkMode === "lan" ? "LAN" : "Local"}` : "本地核心不可达",
    adminLabel,
    aiLabel: health?.aiConfigured ? "AI 已配置" : "AI 未配置",
    deviceLabel: `设备 ${onlineDeviceCount}/${deviceCount} 在线`,
    url: localUrl("/admin/login"),
    updatedAt: Date.now(),
  };
}

function publicDesktopShellStatus() {
  return {
    trayAvailable: Boolean(tray),
    core: desktopShellStatus.core,
    coreLabel: desktopShellStatus.coreLabel,
    adminLabel: desktopShellStatus.adminLabel,
    aiLabel: desktopShellStatus.aiLabel,
    deviceLabel: desktopShellStatus.deviceLabel,
    url: desktopShellStatus.url || localUrl("/admin/login"),
    updatedAt: desktopShellStatus.updatedAt,
  };
}

function releaseDirCandidates() {
  return Array.from(new Set([
    process.env.LIFEOS_RELEASE_DIR ? path.resolve(process.env.LIFEOS_RELEASE_DIR) : "",
    path.join(process.cwd(), "release"),
    path.join(process.cwd(), "..", "release"),
  ].filter(Boolean)));
}

function publicReleaseArtifactSummary(artifact) {
  return {
    platform: typeof artifact?.platform === "string" ? artifact.platform : "",
    fileName: artifact?.fileName ? path.basename(String(artifact.fileName)) : "",
    feedFile: artifact?.feedFile ? path.basename(String(artifact.feedFile)) : "",
    size: Number.isFinite(Number(artifact?.size)) ? Number(artifact.size) : 0,
    sha512Present: typeof artifact?.sha512 === "string" && artifact.sha512.length > 0,
    sha256: typeof artifact?.sha256 === "string" ? artifact.sha256 : "",
    releaseDate: typeof artifact?.releaseDate === "string" ? artifact.releaseDate : "",
  };
}

function readReleaseSnapshot() {
  for (const releaseDir of releaseDirCandidates()) {
    const manifestPath = path.join(releaseDir, "update-feed", "release-manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const checksumPath = path.join(releaseDir, "SHA256SUMS");
      const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts.map(publicReleaseArtifactSummary) : [];
      return {
        manifestAvailable: true,
        checksumAvailable: fs.existsSync(checksumPath),
        version: typeof manifest.version === "string" ? manifest.version : "",
        generatedAt: typeof manifest.generatedAt === "string" ? manifest.generatedAt : "",
        artifactCount: artifacts.length,
        artifacts,
      };
    } catch (error) {
      return {
        manifestAvailable: false,
        checksumAvailable: false,
        version: "",
        generatedAt: "",
        artifactCount: 0,
        artifacts: [],
        error: "release manifest is unreadable",
      };
    }
  }
  return {
    manifestAvailable: false,
    checksumAvailable: false,
    version: app.getVersion(),
    generatedAt: "",
    artifactCount: 0,
    artifacts: [],
  };
}

async function createDesktopDiagnosticBundle() {
  const logStat = desktopLogPath && fs.existsSync(desktopLogPath) ? fs.statSync(desktopLogPath) : null;
  const [healthResult, adminStatusResult] = await Promise.all([
    fetchLocalJson("/api/v1/health"),
    fetchLocalJson("/api/v1/admin/status"),
  ]);
  if (healthResult.ok) {
    desktopShellStatus = summarizeDesktopShellStatus(healthResult.body, adminStatusResult.ok ? adminStatusResult.body : null);
  }
  return {
    generatedAt: new Date().toISOString(),
    desktop: {
      appName: app.getName(),
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      node: process.versions.node,
    },
    desktopShell: publicDesktopShellStatus(),
    mainWindow: mainWindow && !mainWindow.isDestroyed() ? {
      url: mainWindow.webContents.getURL(),
      visible: mainWindow.isVisible(),
      title: mainWindow.getTitle(),
    } : null,
    localCore: {
      port: serverPort,
      url: localUrl("/admin/login"),
      dataDirConfigured: Boolean(process.env.LIFEOS_DATA_DIR),
      publicBaseUrlConfigured: Boolean(process.env.PUBLIC_BASE_URL || process.env.APP_URL),
      publicAccessAllowed: process.env.LIFEOS_ALLOW_PUBLIC === "1",
      health: healthResult.ok ? publicHealthSnapshot(healthResult.body) : null,
      healthStatus: healthResult.status,
      healthError: healthResult.ok ? "" : healthResult.error || "",
      adminStatus: adminStatusResult.ok ? publicAdminStatusSnapshot(adminStatusResult.body) : null,
      adminStatusCode: adminStatusResult.status,
      adminStatusError: adminStatusResult.ok ? "" : adminStatusResult.error || "",
    },
    updates: {
      configured: Boolean(process.env.LIFEOS_UPDATE_URL),
      updateUrlHost: process.env.LIFEOS_UPDATE_URL ? (() => {
        try {
          return new URL(process.env.LIFEOS_UPDATE_URL).host;
        } catch {
          return "invalid-url";
        }
      })() : "",
    },
    release: readReleaseSnapshot(),
    logs: {
      fileName: desktopLogPath ? path.basename(desktopLogPath) : "",
      directoryAvailable: Boolean(desktopLogPath),
      directoryLabel: desktopLogPath ? "系统日志目录已配置，可从桌面菜单打开" : "系统日志目录未初始化",
      size: logStat?.size || 0,
      modifiedAt: logStat?.mtimeMs || null,
      tail: readLogTail(),
    },
  };
}

async function exportDesktopDiagnosticBundle(targetPath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  let outputPath = targetPath;
  if (!outputPath) {
    const result = await dialog.showSaveDialog({
      title: "导出 LifeOS AI 桌面诊断包",
      defaultPath: `lifeos-desktop-diagnostics-${stamp}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) return null;
    outputPath = result.filePath;
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(await createDesktopDiagnosticBundle(), null, 2));
  writeDesktopLog("Desktop diagnostic bundle exported", path.basename(outputPath));
  return outputPath;
}

function showStartupFailureWindow(error) {
  const logsDir = desktopLogPath ? path.dirname(desktopLogPath) : app.getPath("logs");
  const message = error?.stack || error?.message || String(error);
  const failureWindow = new BrowserWindow({
    width: 760,
    height: 560,
    minWidth: 640,
    minHeight: 480,
    title: "LifeOS AI 启动失败",
    backgroundColor: "#060a10",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>LifeOS AI 启动失败</title>
    <style>
      body { margin: 0; min-height: 100vh; background: #060a10; color: #e4e4e7; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: grid; place-items: center; }
      main { width: min(640px, calc(100vw - 48px)); border: 1px solid rgba(255,255,255,.08); background: #101722; border-radius: 24px; padding: 28px; box-shadow: 0 24px 80px rgba(0,0,0,.35); }
      h1 { margin: 0; font-size: 24px; }
      p { color: #a1a1aa; line-height: 1.7; }
      code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .path { margin-top: 16px; padding: 12px; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; background: rgba(255,255,255,.04); word-break: break-all; color: #67e8f9; }
      pre { max-height: 180px; overflow: auto; padding: 12px; border-radius: 14px; background: #060a10; border: 1px solid rgba(248,113,113,.2); color: #fecaca; white-space: pre-wrap; }
      .hint { margin-top: 16px; color: #d4d4d8; }
    </style>
  </head>
  <body>
    <main>
      <h1>LifeOS AI 本地核心启动失败</h1>
      <p>桌面外壳已经打开，但本地服务没有成功启动。请打开日志目录查看 <code>lifeos-desktop.log</code>，修复后重新启动 LifeOS AI。</p>
      <div class="path">${htmlEscape(logsDir)}</div>
      <p class="hint">常见原因：端口被占用、数据目录权限异常、打包文件缺失，或安全配置环境变量不完整。</p>
      <pre>${htmlEscape(message)}</pre>
    </main>
  </body>
</html>`;
  failureWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return failureWindow;
}

function copyLocalAddress() {
  clipboard.writeText(localUrl("/admin/login"));
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: "LifeOS AI", enabled: false },
    { label: desktopShellStatus.coreLabel, enabled: false },
    { label: desktopShellStatus.adminLabel, enabled: false },
    { label: desktopShellStatus.aiLabel, enabled: false },
    { label: desktopShellStatus.deviceLabel, enabled: false },
    { label: `本机端口 ${serverPort}`, enabled: false },
    { type: "separator" },
    { label: "打开控制台", click: () => showMainWindow("/admin/dashboard") },
    { label: "手机绑定", click: () => showMainWindow("/admin/devices/pair") },
    { label: "系统设置", click: () => showMainWindow("/admin/settings") },
    { type: "separator" },
    { label: "刷新状态", click: () => refreshDesktopShellStatus().catch((error) => writeDesktopLog("Failed to refresh tray status", error?.message || String(error))) },
    { label: "复制本机地址", click: copyLocalAddress },
    { label: "导出桌面诊断包", click: () => exportDesktopDiagnosticBundle().catch((error) => writeDesktopLog("Failed to export desktop diagnostics", error?.message || String(error))) },
    { label: "打开日志目录", click: openLogsFolder },
    { type: "separator" },
    { role: "quit", label: "退出" },
  ]);
}

function updateTrayPresentation() {
  if (!tray) return;
  tray.setToolTip(`LifeOS AI: ${desktopShellStatus.coreLabel} · ${desktopShellStatus.aiLabel} · ${localUrl("/admin/login")}`);
  tray.setContextMenu(buildTrayMenu());
}

async function refreshDesktopShellStatus() {
  const [healthResult, adminStatusResult] = await Promise.all([
    fetchLocalJson("/api/v1/health"),
    fetchLocalJson("/api/v1/admin/status"),
  ]);
  desktopShellStatus = summarizeDesktopShellStatus(
    healthResult.ok ? healthResult.body : null,
    adminStatusResult.ok ? adminStatusResult.body : null,
  );
  updateTrayPresentation();
  return desktopShellStatus;
}

function buildMenuTemplate() {
  return [
    {
      label: "LifeOS AI",
      submenu: [
        { label: "打开控制台", click: () => showMainWindow("/admin/dashboard") },
        { label: "手机绑定", click: () => showMainWindow("/admin/devices/pair") },
        { label: "系统设置", click: () => showMainWindow("/admin/settings") },
        { type: "separator" },
        { label: "复制本机地址", click: copyLocalAddress },
        { label: "导出桌面诊断包", click: () => exportDesktopDiagnosticBundle().catch((error) => writeDesktopLog("Failed to export desktop diagnostics", error?.message || String(error))) },
        { label: "打开日志目录", click: openLogsFolder },
        { type: "separator" },
        { role: "quit", label: "退出 LifeOS AI" },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "窗口",
      submenu: [
        { role: "reload", label: "重新载入" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "minimize", label: "最小化" },
        { role: "close", label: "关闭窗口" },
      ],
    },
  ];
}

async function configureDesktopShell() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate()));

  const iconPath = path.join(app.isPackaged ? app.getAppPath() : process.cwd(), "desktop", "icon.icns");
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  updateTrayPresentation();
  await refreshDesktopShellStatus().catch((error) => writeDesktopLog("Failed to refresh tray status", error?.message || String(error)));
  trayRefreshTimer = setInterval(() => {
    refreshDesktopShellStatus().catch((error) => writeDesktopLog("Failed to refresh tray status", error?.message || String(error)));
  }, 60_000);
  tray.on("click", () => showMainWindow("/admin/dashboard"));
}

function configureUpdates() {
  if (!app.isPackaged || !process.env.LIFEOS_UPDATE_URL) return;
  autoUpdater.autoDownload = false;
  autoUpdater.setFeedURL({ provider: "generic", url: process.env.LIFEOS_UPDATE_URL });
  autoUpdater.checkForUpdates().catch((error) => {
    console.warn("LifeOS update check failed:", error?.message || error);
  });
}

app.whenReady().then(async () => {
  try {
    await startLocalCore();
    await configureDesktopShell();
    await createWindow();
    if (process.env.LIFEOS_DESKTOP_EXPORT_DIAGNOSTIC_ON_START) {
      await exportDesktopDiagnosticBundle(process.env.LIFEOS_DESKTOP_EXPORT_DIAGNOSTIC_ON_START);
    }
    configureUpdates();
  } catch (error) {
    writeDesktopLog("LifeOS startup failed", error?.stack || error?.message || String(error));
    console.error("LifeOS startup failed:", error?.message || error);
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: "LifeOS AI",
        submenu: [
          { label: "导出桌面诊断包", click: () => exportDesktopDiagnosticBundle().catch((exportError) => writeDesktopLog("Failed to export desktop diagnostics", exportError?.message || String(exportError))) },
          { label: "打开日志目录", click: openLogsFolder },
          { role: "quit", label: "退出 LifeOS AI" },
        ],
      },
    ]));
    showStartupFailureWindow(error);
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (trayRefreshTimer) clearInterval(trayRefreshTimer);
});
