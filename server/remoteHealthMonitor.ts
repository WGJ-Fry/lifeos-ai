import { getDesktopRuntimeConfig } from "./desktopRuntimeConfig.ts";
import { maybeStartConfiguredCloudflareTunnel } from "./cloudflareTunnel.ts";
import { maybeStartConfiguredTailscaleServe, testConnectionUrl } from "./networkDiagnostics.ts";
import { getRemoteValidationReport, saveRemoteValidationReport } from "./remoteValidationReport.ts";

let monitorTimer: ReturnType<typeof setInterval> | null = null;
let running = false;

function intervalMs() {
  const value = Number.parseInt(String(process.env.LIFEOS_REMOTE_HEALTH_INTERVAL_MS || ""), 10);
  if (Number.isFinite(value) && value >= 30_000) return value;
  return 5 * 60 * 1000;
}

function remoteBaseUrl() {
  const config = getDesktopRuntimeConfig();
  if (!config || !config.publicBaseUrl || config.mode === "local" || config.mode === "lan") return "";
  return config.publicBaseUrl;
}

export async function runRemoteHealthCheck(reason = "manual") {
  const baseUrl = remoteBaseUrl();
  if (!baseUrl) return { skipped: true, reason: "no_remote_entry", report: getRemoteValidationReport() };
  if (running) return { skipped: true, reason: "already_running", report: getRemoteValidationReport() };
  running = true;
  try {
    let restored = false;
    let result = await testConnectionUrl(baseUrl);
    if (!result.ok) {
      restored = await restoreSavedRemoteEntry();
      if (restored) result = await testConnectionUrl(baseUrl);
    }
    const report = saveRemoteValidationReport({
      label: labelForReason(reason, restored),
      baseUrl,
      result,
    }, { type: "system", id: "remote-health-monitor" });
    return { skipped: false, reason, restored, report };
  } finally {
    running = false;
  }
}

function labelForReason(reason: string, restored: boolean) {
  if (restored) return "Remote health check after auto-restore";
  if (reason === "startup") return "Startup remote health check";
  if (reason === "manual") return "Manual remote health check";
  return "Scheduled remote health check";
}

async function restoreSavedRemoteEntry() {
  const config = getDesktopRuntimeConfig();
  if (!config || !config.publicBaseUrl) return false;
  try {
    if (config.mode === "cloudflare") {
      await maybeStartConfiguredCloudflareTunnel(String(config.port || process.env.LIFEOS_PORT || process.env.PORT || "3000"), 5000);
      return true;
    }
    if (config.mode === "tailscale") {
      const result = maybeStartConfiguredTailscaleServe(String(config.port || process.env.LIFEOS_PORT || process.env.PORT || "3000"));
      return Boolean(result.started || result.reason === "already_running");
    }
  } catch {
    return false;
  }
  return false;
}

export function startRemoteHealthMonitor() {
  if (process.env.LIFEOS_REMOTE_HEALTH_MONITOR === "0") return;
  if (monitorTimer) return;
  setTimeout(() => {
    runRemoteHealthCheck("startup").catch(() => null);
  }, 4000).unref();
  monitorTimer = setInterval(() => {
    runRemoteHealthCheck("schedule").catch(() => null);
  }, intervalMs());
  monitorTimer.unref();
}
