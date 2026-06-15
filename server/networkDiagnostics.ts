import { execFileSync } from "child_process";
import os from "os";
import { getDesktopRuntimeConfig } from "./desktopRuntimeConfig.ts";
import { getConfiguredPublicBaseUrl } from "./publicBaseUrl";

type CommandResult = {
  ok: boolean;
  output: string;
};

function runCommand(command: string, args: string[] = []): CommandResult {
  try {
    const output = execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 2500,
    });
    return { ok: true, output: output.trim() };
  } catch (error: any) {
    const output = `${error?.stdout || ""}${error?.stderr || ""}`.trim();
    return { ok: false, output };
  }
}

function getProcessOutput(name: string) {
  const command = process.platform === "win32" ? "tasklist" : "pgrep";
  const args = process.platform === "win32" ? [] : ["-fl", name];
  return runCommand(command, args);
}

function isProcessRunning(name: string) {
  const result = getProcessOutput(name);
  return result.ok && result.output.toLowerCase().includes(name.toLowerCase());
}

export function extractCloudflareTunnelUrls(output: string) {
  const matches = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/gi) || [];
  return Array.from(new Set(matches.map((url) => url.replace(/\/$/, ""))));
}

function getLanUrls(port: string) {
  return Object.values(os.networkInterfaces())
    .flatMap((entries) => entries || [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => `http://${entry.address}:${port}`);
}

function connectionCandidate(input: {
  id: string;
  label: string;
  baseUrl: string;
  mode: "configured" | "cloudflare" | "tailscale" | "lan" | "local";
  priority: number;
  requiresRestart: boolean;
  notes: string[];
}) {
  const secure = input.baseUrl.startsWith("https://") || input.mode === "tailscale" || input.mode === "local";
  const normalizedBaseUrl = input.baseUrl.replace(/\/$/, "");
  const envTemplate = input.mode === "local"
    ? `LIFEOS_HOST=127.0.0.1 LIFEOS_PORT=${new URL(normalizedBaseUrl).port || "3000"} npm run start`
    : `LIFEOS_HOST=0.0.0.0 LIFEOS_ALLOW_PUBLIC=1 PUBLIC_BASE_URL=${normalizedBaseUrl} npm run start`;
  return {
    ...input,
    baseUrl: normalizedBaseUrl,
    secure,
    envTemplate,
    restartInstruction: input.requiresRestart
      ? "复制启动环境，退出 LifeOS AI 后用该环境重新启动，本地址才会用于二维码和手机入口。"
      : "当前地址已经生效，可直接复制绑定入口或测试连通性。",
    mobilePairUrl: `${normalizedBaseUrl}/mobile/pair`,
    mobileChatUrl: `${normalizedBaseUrl}/mobile/chat`,
  };
}

function buildConnectionCandidates(input: {
  port: string;
  publicBaseUrl: string;
  lanUrls: string[];
  cloudflare: ReturnType<typeof getCloudflareTunnelStatus>;
  tailscale: ReturnType<typeof getTailscaleStatus>;
}) {
  const candidates: ReturnType<typeof connectionCandidate>[] = [];
  if (input.publicBaseUrl) {
    candidates.push(connectionCandidate({
      id: "configured-public",
      label: "当前 PUBLIC_BASE_URL",
      baseUrl: input.publicBaseUrl,
      mode: "configured",
      priority: input.publicBaseUrl.startsWith("https://") ? 100 : 70,
      requiresRestart: false,
      notes: input.publicBaseUrl.startsWith("https://")
        ? ["当前已配置 HTTPS 公网/隧道地址，绑定二维码会优先使用它。"]
        : ["当前 PUBLIC_BASE_URL 不是 HTTPS，仅建议在 Tailscale 或可信内网中使用。"],
    }));
  }
  for (const [index, url] of input.cloudflare.detectedUrls.entries()) {
    candidates.push(connectionCandidate({
      id: `cloudflare-${index}`,
      label: index === 0 ? "Cloudflare Tunnel" : `Cloudflare Tunnel ${index + 1}`,
      baseUrl: url,
      mode: "cloudflare",
      priority: 90 - index,
      requiresRestart: input.publicBaseUrl !== url,
      notes: ["适合异地访问。复制启动环境并重启后，绑定二维码会使用这个 HTTPS 地址。"],
    }));
  }
  for (const [index, url] of input.tailscale.magicDnsUrls.entries()) {
    candidates.push(connectionCandidate({
      id: `tailscale-magicdns-${index}`,
      label: index === 0 ? "Tailscale MagicDNS" : `Tailscale MagicDNS ${index + 1}`,
      baseUrl: url,
      mode: "tailscale",
      priority: 82 - index,
      requiresRestart: input.publicBaseUrl !== url,
      notes: ["适合自己的手机和电脑异地连接。手机需登录同一个 Tailnet。"],
    }));
  }
  for (const [index, url] of input.tailscale.urls.entries()) {
    candidates.push(connectionCandidate({
      id: `tailscale-ip-${index}`,
      label: index === 0 ? "Tailscale IP" : `Tailscale IP ${index + 1}`,
      baseUrl: url,
      mode: "tailscale",
      priority: 78 - index,
      requiresRestart: input.publicBaseUrl !== url,
      notes: ["MagicDNS 不可用时可用 Tailnet IP。手机需登录同一个 Tailnet。"],
    }));
  }
  for (const [index, url] of input.lanUrls.entries()) {
    candidates.push(connectionCandidate({
      id: `lan-${index}`,
      label: index === 0 ? "局域网 Wi-Fi" : `局域网地址 ${index + 1}`,
      baseUrl: url,
      mode: "lan",
      priority: 50 - index,
      requiresRestart: true,
      notes: ["适合同一 Wi-Fi。离开当前网络后通常不可用。"],
    }));
  }
  candidates.push(connectionCandidate({
    id: "local",
    label: "本机管理",
    baseUrl: `http://127.0.0.1:${input.port}`,
    mode: "local",
    priority: 10,
    requiresRestart: false,
    notes: ["只适合电脑本机管理，手机无法扫码访问。"],
  }));
  return candidates
    .filter((candidate, index, all) => all.findIndex((item) => item.baseUrl === candidate.baseUrl) === index)
    .sort((left, right) => right.priority - left.priority);
}

function getCloudflareTunnelStatus(port: string) {
  const version = runCommand("cloudflared", ["--version"]);
  const installed = version.ok;
  const processOutput = installed ? getProcessOutput("cloudflared") : { ok: false, output: "" };
  const running = installed && processOutput.ok && processOutput.output.toLowerCase().includes("cloudflared");
  const detectedUrls = extractCloudflareTunnelUrls(processOutput.output);
  return {
    installed,
    running,
    version: installed ? version.output.split("\n")[0] : "",
    detectedUrls,
    suggestedCommand: `cloudflared tunnel --url http://127.0.0.1:${port}`,
    installCommand: process.platform === "darwin" ? "brew install cloudflared" : "下载并安装 cloudflared 后确认命令可用",
    envTemplate: `LIFEOS_HOST=0.0.0.0 LIFEOS_ALLOW_PUBLIC=1 PUBLIC_BASE_URL=${detectedUrls[0] || "https://<your-tunnel>.trycloudflare.com"} npm run start`,
    notes: installed
      ? [
        running ? "检测到 cloudflared 进程正在运行。" : "已安装 cloudflared，可运行下方命令创建临时 HTTPS 隧道。",
        detectedUrls[0] ? `检测到临时隧道地址：${detectedUrls[0]}` : "临时隧道会输出 trycloudflare.com 地址，把它填入 PUBLIC_BASE_URL 后重启 LifeOS AI。",
      ]
      : [
        "未检测到 cloudflared CLI。安装后可创建临时 HTTPS 隧道。",
        "安装方式：macOS 可用 brew install cloudflared；也可从 Cloudflare 官方发布页下载。",
      ],
  };
}

function getTailscaleStatus() {
  const version = runCommand("tailscale", ["version", "--short"]);
  const installed = version.ok;
  let online = false;
  let deviceName = "";
  let tailnetName = "";
  let urls: string[] = [];
  let magicDnsUrls: string[] = [];

  if (installed) {
    const status = runCommand("tailscale", ["status", "--json"]);
    if (status.ok) {
      try {
        const parsed = JSON.parse(status.output);
        online = Boolean(parsed?.Self?.Online);
        deviceName = parsed?.Self?.HostName || "";
        tailnetName = parsed?.MagicDNSSuffix || "";
        urls = (parsed?.Self?.TailscaleIPs || []).map((ip: string) => `http://${ip}:${process.env.LIFEOS_PORT || process.env.PORT || 3000}`);
        if (deviceName && tailnetName) {
          magicDnsUrls = [`http://${deviceName}.${tailnetName}:${process.env.LIFEOS_PORT || process.env.PORT || 3000}`];
        }
      } catch {
        online = status.output.toLowerCase().includes("logged in");
      }
    }
  }

  const mobileUrls = Array.from(new Set([...magicDnsUrls, ...urls]));

  return {
    installed,
    online,
    version: installed ? version.output.split("\n")[0] : "",
    deviceName,
    tailnetName,
    urls,
    magicDnsUrls,
    mobileUrls,
    installCommand: process.platform === "darwin" ? "brew install --cask tailscale" : "安装 Tailscale 客户端并登录同一个 Tailnet",
    envTemplate: mobileUrls[0] ? `LIFEOS_HOST=0.0.0.0 LIFEOS_ALLOW_PUBLIC=1 PUBLIC_BASE_URL=${mobileUrls[0]} npm run start` : `LIFEOS_HOST=0.0.0.0 LIFEOS_ALLOW_PUBLIC=1 npm run start`,
    notes: installed
      ? [
        online ? "Tailscale 已登录并在线，可优先使用 MagicDNS 或 Tailnet IP 访问。" : "已安装 Tailscale，但当前未检测到在线状态。",
        "Tailscale 适合自己设备之间异地访问，通常不需要把服务暴露到公开互联网。",
      ]
      : [
        "未检测到 Tailscale CLI。安装并登录后，手机和电脑加入同一 Tailnet 即可访问。",
      ],
  };
}

export function getNetworkDiagnostics() {
  const port = process.env.LIFEOS_PORT || process.env.PORT || "3000";
  const host = process.env.LIFEOS_HOST || "127.0.0.1";
  const publicBaseUrl = getConfiguredPublicBaseUrl();
  const lanUrls = getLanUrls(port);
  const cloudflare = getCloudflareTunnelStatus(port);
  const tailscale = getTailscaleStatus();
  const connectionCandidates = buildConnectionCandidates({ port, publicBaseUrl, lanUrls, cloudflare, tailscale });
  const recommendedBaseUrl = connectionCandidates[0]?.baseUrl || `http://127.0.0.1:${port}`;
  const desktopRuntimeConfig = getDesktopRuntimeConfig();

  return {
    host,
    port,
    publicBaseUrl,
    publicAccessAllowed: process.env.LIFEOS_ALLOW_PUBLIC === "1",
    lanUrls,
    lanEnvTemplate: `LIFEOS_HOST=0.0.0.0 LIFEOS_ALLOW_PUBLIC=1 npm run start`,
    recommendedBaseUrl,
    connectionCandidates,
    desktopRuntimeConfig,
    cloudflare,
    tailscale,
    safety: {
      publicModeRequired: host === "0.0.0.0" || Boolean(publicBaseUrl),
      requiresHttpsForInternet: Boolean(publicBaseUrl) && !publicBaseUrl.startsWith("https://"),
      notes: [
        "异地访问优先选择 Tailscale 或 Cloudflare Tunnel。",
        "公开互联网访问必须设置 LIFEOS_ALLOW_PUBLIC=1，并确认前方是可信 HTTPS 隧道或反向代理。",
      ],
    },
  };
}

export async function testConnectionUrl(baseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP/HTTPS URLs can be tested");
  }
  parsed.username = "";
  parsed.password = "";
  parsed.search = "";
  parsed.hash = "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  const healthUrl = new URL("/api/v1/health", parsed.origin);
  const startedAt = Date.now();
  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    const body = await response.json().catch(() => null);
    return {
      ok: response.ok && body?.service === "lifeos-local-core",
      status: response.status,
      url: healthUrl.toString(),
      latencyMs: Date.now() - startedAt,
      service: body?.service || "",
      publicAccessWarning: Boolean(body?.publicAccessWarning),
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      url: healthUrl.toString(),
      latencyMs: Date.now() - startedAt,
      error: error?.name === "AbortError" ? "Connection test timed out" : error?.message || "Connection test failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
