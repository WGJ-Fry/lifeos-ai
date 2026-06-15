import type express from "express";
import { setHttpOnlyCookie } from "./httpSecurity";

export const INSTALL_PAIRING_COOKIE = "lifeos_pairing_intent";
export const INSTALL_PAIRING_TTL_MS = 24 * 60 * 60 * 1000;

const MANIFEST_LINK_PATTERN = /<link rel="manifest" href="\/manifest\.webmanifest" \/>/;

export function normalizeInstallPairingToken(value: unknown) {
  if (typeof value !== "string") return "";
  const token = value.trim();
  if (!/^bind_[A-Za-z0-9_-]{8,180}$/.test(token)) return "";
  return token;
}

export function pairingInstallPath(pairingToken: string) {
  return `/mobile/install/${encodeURIComponent(pairingToken)}`;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export function getInstallPairingToken(req: express.Request) {
  const installPathMatch = req.path.match(/^\/mobile\/install\/([^/?#]+)$/);
  const rawToken = installPathMatch
    ? safeDecodeURIComponent(installPathMatch[1] || "")
    : req.path === "/mobile/pair"
      ? req.query.token
      : req.query.pairingToken;
  return normalizeInstallPairingToken(rawToken);
}

export function htmlWithInstallPairingManifest(html: string, req: express.Request) {
  const pairingToken = getInstallPairingToken(req);
  if (!pairingToken) return html;
  const manifestHref = `/manifest.webmanifest?pairingToken=${encodeURIComponent(pairingToken)}`;
  return html.replace(MANIFEST_LINK_PATTERN, `<link rel="manifest" href="${manifestHref}" />`);
}

export function setInstallPairingIntentCookie(res: express.Response, pairingToken: string) {
  if (!pairingToken) return;
  setHttpOnlyCookie(res, INSTALL_PAIRING_COOKIE, pairingToken, Date.now() + INSTALL_PAIRING_TTL_MS);
}

export function mobileManifest(pairingToken = "") {
  const startUrl = pairingToken ? pairingInstallPath(pairingToken) : "/mobile/chat";
  return {
    name: "LifeOS AI",
    short_name: "LifeOS",
    id: "/mobile/chat",
    description: "Personal AI mobile client connected to your LifeOS desktop core.",
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    orientation: "portrait",
    background_color: "#060a10",
    theme_color: "#060a10",
    categories: ["productivity", "utilities"],
    launch_handler: {
      client_mode: "navigate-existing",
    },
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/real-mobile-chat.jpg",
        sizes: "390x844",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "手机端 AI 聊天",
      },
      {
        src: "/screenshots/real-mobile-device.jpg",
        sizes: "390x844",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "设备与连接",
      },
    ],
    shortcuts: [
      {
        name: "手机端 AI",
        short_name: "AI",
        url: "/mobile/chat",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "绑定电脑",
        short_name: "绑定",
        url: pairingToken ? pairingInstallPath(pairingToken) : "/mobile/device",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "本地能力",
        short_name: "能力",
        url: "/mobile/actions",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
