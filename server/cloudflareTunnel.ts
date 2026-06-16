import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { getDesktopRuntimeConfig, saveDesktopRuntimeConfig } from "./desktopRuntimeConfig.ts";

type ManagedTunnel = {
  process: ChildProcessWithoutNullStreams | null;
  url: string;
  pid: number | null;
  startedAt: number | null;
  lastOutput: string;
  lastError: string;
  command: string;
};

const managedTunnel: ManagedTunnel = {
  process: null,
  url: "",
  pid: null,
  startedAt: null,
  lastOutput: "",
  lastError: "",
  command: "",
};

export function extractCloudflareTunnelUrls(output: string) {
  const matches = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/gi) || [];
  return Array.from(new Set(matches.map((url) => url.replace(/\/$/, ""))));
}

function appendOutput(value: string) {
  const next = `${managedTunnel.lastOutput}\n${value}`.trim();
  managedTunnel.lastOutput = next.slice(-8000);
  const detected = extractCloudflareTunnelUrls(managedTunnel.lastOutput);
  if (detected[0]) managedTunnel.url = detected[0];
}

function commandForPort(port: string) {
  const command = process.env.LIFEOS_CLOUDFLARED_BIN || "cloudflared";
  return `${command} tunnel --url http://127.0.0.1:${port}`;
}

export function getManagedCloudflareTunnelStatus() {
  const running = Boolean(managedTunnel.process && !managedTunnel.process.killed);
  return {
    running,
    starting: running && !managedTunnel.url,
    url: managedTunnel.url,
    pid: running ? managedTunnel.pid : null,
    startedAt: running ? managedTunnel.startedAt : null,
    command: managedTunnel.command,
    lastOutput: managedTunnel.lastOutput,
    lastError: managedTunnel.lastError,
  };
}

export function stopManagedCloudflareTunnel() {
  if (managedTunnel.process && !managedTunnel.process.killed) {
    managedTunnel.process.kill("SIGTERM");
  }
  managedTunnel.process = null;
  managedTunnel.pid = null;
  managedTunnel.startedAt = null;
  managedTunnel.url = "";
  managedTunnel.command = "";
  return getManagedCloudflareTunnelStatus();
}

function isAutostartDisabled() {
  return process.env.LIFEOS_DISABLE_CLOUDFLARE_AUTOSTART === "1"
    || process.env.LIFEOS_CLOUDFLARE_AUTOSTART === "0";
}

export async function maybeStartConfiguredCloudflareTunnel(port: string, timeoutMs = 15000) {
  const config = getDesktopRuntimeConfig();
  if (!config || config.mode !== "cloudflare" || isAutostartDisabled()) {
    return { started: false, reason: "not_configured", tunnel: getManagedCloudflareTunnelStatus(), config };
  }

  const tunnel = await startManagedCloudflareTunnel(port, timeoutMs);
  if (!tunnel.url) throw new Error("Cloudflare Tunnel did not return a public URL");

  process.env.PUBLIC_BASE_URL = tunnel.url;
  const updatedConfig = saveDesktopRuntimeConfig({
    mode: "cloudflare",
    label: "Cloudflare Tunnel",
    baseUrl: tunnel.url,
  });

  return {
    started: true,
    reason: "cloudflare_configured",
    tunnel: getManagedCloudflareTunnelStatus(),
    config: updatedConfig,
  };
}

export function startManagedCloudflareTunnel(port: string, timeoutMs = 15000) {
  const current = getManagedCloudflareTunnelStatus();
  if (current.running && current.url) return Promise.resolve(current);
  if (current.running && current.starting) return waitForManagedTunnelUrl(timeoutMs);

  managedTunnel.lastOutput = "";
  managedTunnel.lastError = "";
  managedTunnel.url = "";
  managedTunnel.command = commandForPort(port);
  managedTunnel.startedAt = Date.now();

  return new Promise<ReturnType<typeof getManagedCloudflareTunnelStatus>>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      fn();
    };

    try {
      const child = spawn(process.env.LIFEOS_CLOUDFLARED_BIN || "cloudflared", ["tunnel", "--url", `http://127.0.0.1:${port}`], {
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      });
      managedTunnel.process = child;
      managedTunnel.pid = child.pid || null;

      const handleOutput = (chunk: Buffer) => {
        appendOutput(chunk.toString("utf8"));
        if (managedTunnel.url) {
          finish(() => resolve(getManagedCloudflareTunnelStatus()));
        }
      };

      child.stdout.on("data", handleOutput);
      child.stderr.on("data", handleOutput);
      child.on("error", (error) => {
        managedTunnel.lastError = error.message || "Failed to start cloudflared";
        managedTunnel.process = null;
        finish(() => reject(new Error(managedTunnel.lastError)));
      });
      child.on("exit", (code, signal) => {
        const expectedStop = settled && managedTunnel.url;
        managedTunnel.process = null;
        managedTunnel.pid = null;
        if (!expectedStop) {
          managedTunnel.lastError = `cloudflared exited before creating a tunnel (${signal || (code ?? "unknown")}).`;
          finish(() => reject(new Error(managedTunnel.lastError)));
        }
      });

      timer = setTimeout(() => {
        const message = managedTunnel.lastOutput
          ? "cloudflared started but no trycloudflare.com URL was detected yet."
          : "Timed out waiting for cloudflared to create a tunnel URL.";
        managedTunnel.lastError = message;
        finish(() => reject(new Error(message)));
      }, timeoutMs);
    } catch (error: any) {
      managedTunnel.lastError = error?.message || "Failed to start cloudflared";
      managedTunnel.process = null;
      finish(() => reject(new Error(managedTunnel.lastError)));
    }
  });
}

export function waitForManagedTunnelUrl(timeoutMs = 15000) {
  const startedAt = Date.now();
  return new Promise<ReturnType<typeof getManagedCloudflareTunnelStatus>>((resolve, reject) => {
    const poll = () => {
      const status = getManagedCloudflareTunnelStatus();
      if (status.url) {
        resolve(status);
        return;
      }
      if (!status.running) {
        reject(new Error(status.lastError || "cloudflared is not running"));
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("Timed out waiting for cloudflared tunnel URL"));
        return;
      }
      setTimeout(poll, 250);
    };
    poll();
  });
}
