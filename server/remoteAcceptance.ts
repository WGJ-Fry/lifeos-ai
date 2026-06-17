import type { RemoteHealthSummary, RemoteValidationReport } from "./remoteValidationReport";

export type RemoteAcceptanceItem = {
  id: "tailscale-https-serve" | "cloudflare-named-tunnel" | "remote-smoke" | "restart-restore" | "cellular-mobile-chat" | "ci-remote-mock";
  status: "passed" | "needs-action" | "manual-required";
  evidence: string;
  action: string;
  command?: string;
};

type AcceptanceDiagnostics = {
  desktopRuntimeConfig?: { mode?: string; publicBaseUrl?: string } | null;
  tailscale?: { serveRunning?: boolean; httpsServeUrl?: string };
  cloudflareNamedTunnel?: { ready?: boolean; configured?: boolean; baseUrl?: string; hostname?: string };
};

function sameUrl(left = "", right = "") {
  try {
    const leftUrl = new URL(left);
    const rightUrl = new URL(right);
    leftUrl.search = "";
    leftUrl.hash = "";
    rightUrl.search = "";
    rightUrl.hash = "";
    return leftUrl.toString().replace(/\/$/, "") === rightUrl.toString().replace(/\/$/, "");
  } catch {
    return false;
  }
}

function reportCoversBase(report: RemoteValidationReport | null, baseUrl = "") {
  return Boolean(report?.ok && baseUrl && sameUrl(report.baseUrl, baseUrl));
}

export function buildRemoteAcceptanceChecklist(input: {
  diagnostics: AcceptanceDiagnostics;
  health: RemoteHealthSummary;
  report: RemoteValidationReport | null;
}): RemoteAcceptanceItem[] {
  const { diagnostics, health, report } = input;
  const runtimeUrl = diagnostics.desktopRuntimeConfig?.publicBaseUrl || health.baseUrl || "";
  const tailscaleUrl = diagnostics.tailscale?.httpsServeUrl || "";
  const namedUrl = diagnostics.cloudflareNamedTunnel?.baseUrl || "";
  const stableHealthPassed = health.status === "healthy" && reportCoversBase(report, runtimeUrl);
  const restored = Boolean(report?.ok && /auto-restore|startup/i.test(report.label || ""));

  return [
    {
      id: "tailscale-https-serve",
      status: diagnostics.tailscale?.serveRunning && tailscaleUrl && stableHealthPassed && sameUrl(runtimeUrl, tailscaleUrl) ? "passed" : "needs-action",
      evidence: diagnostics.tailscale?.serveRunning && tailscaleUrl ? tailscaleUrl : "Tailscale HTTPS Serve has not been proven as the saved healthy entry.",
      action: "Start Tailscale HTTPS Serve, save it as the desktop remote entry, restart LifeOS AI, then run remote health.",
      command: "tailscale serve --bg https:443 http://127.0.0.1:3000",
    },
    {
      id: "cloudflare-named-tunnel",
      status: diagnostics.cloudflareNamedTunnel?.ready && namedUrl && stableHealthPassed && sameUrl(runtimeUrl, namedUrl) ? "passed" : "needs-action",
      evidence: diagnostics.cloudflareNamedTunnel?.ready && namedUrl ? namedUrl : "Cloudflare Named Tunnel is not configured and verified as the saved healthy entry.",
      action: "Generate the Named Tunnel config, start it, save its HTTPS hostname, restart LifeOS AI, then run remote health.",
      command: "cloudflared tunnel run <name>",
    },
    {
      id: "remote-smoke",
      status: report?.ok && stableHealthPassed ? "passed" : "needs-action",
      evidence: report ? `${report.passed}/${report.total} checks at ${report.baseUrl}` : "No saved remote smoke report yet.",
      action: "Run the admin remote health check or execute npm run remote:smoke with LIFEOS_REMOTE_BASE_URL.",
      command: "LIFEOS_REMOTE_BASE_URL=https://your-stable-entry npm run remote:smoke",
    },
    {
      id: "restart-restore",
      status: restored ? "passed" : "manual-required",
      evidence: restored ? report!.label : "Restart LifeOS AI and confirm the saved Tailscale/Named Tunnel entry is restored automatically.",
      action: "Quit and reopen the desktop app, then run the remote health check again.",
    },
    {
      id: "cellular-mobile-chat",
      status: "manual-required",
      evidence: "Requires a real phone on cellular data opening /mobile/chat through the saved HTTPS entry.",
      action: "Turn off phone Wi-Fi, open the saved mobile entry, send a chat message, and confirm WebSocket/retry state is healthy.",
    },
    {
      id: "ci-remote-mock",
      status: "passed",
      evidence: "GitHub Actions runs npm run remote:mock-smoke as the remote-path regression guard.",
      action: "Keep the Quality Gate workflow required before merging.",
      command: "npm run remote:mock-smoke",
    },
  ];
}
