import type express from "express";
import { listAiProviderStatuses } from "../appSecrets";
import { isAdminConfigured } from "../auth";
import { getDevices } from "../devices";
import { getCookie } from "../httpSecurity";
import { INSTALL_PAIRING_COOKIE, mobileManifest, normalizeInstallPairingToken } from "../mobileInstall";
import { getConfiguredPublicBaseUrl } from "../publicBaseUrl";
import { getOnlineDeviceCount } from "../realtime";
import { getSecurityDiagnostics } from "../securityDiagnostics";

export function registerCoreRoutes(app: express.Express, host: string) {
  app.get("/manifest.webmanifest", (req, res) => {
    const pairingToken = normalizeInstallPairingToken(req.query.pairingToken);
    if (pairingToken) {
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader("Cache-Control", "no-cache");
    }
    res.type("application/manifest+json").json(mobileManifest(pairingToken));
  });

  app.get("/api/v1/mobile/pairing-intent", (req, res) => {
    const pairingToken = normalizeInstallPairingToken(getCookie(req, INSTALL_PAIRING_COOKIE));
    res.setHeader("Cache-Control", "no-store");
    res.json({ token: pairingToken });
  });

  app.get("/api/v1/health", (_req, res) => {
    const publicBaseUrl = getConfiguredPublicBaseUrl();
    const aiConfigured = listAiProviderStatuses().some((provider) => provider.configured);
    const adminConfigured = isAdminConfigured();
    const publicAccessWarning = Boolean(publicBaseUrl) || host === "0.0.0.0";
    const securityDiagnostics = getSecurityDiagnostics();
    const publicRiskItems = securityDiagnostics.publicMode
      ? securityDiagnostics.items.filter((item) => item.status !== "ok")
      : [];
    res.json({
      ok: true,
      service: "lifeos-local-core",
      version: "0.1.0",
      uptime: process.uptime(),
      deviceCount: getDevices().length,
      onlineDeviceCount: getOnlineDeviceCount(),
      aiConfigured,
      adminConfigured,
      host,
      networkMode: host === "0.0.0.0" ? "lan" : "local",
      publicBaseUrl,
      publicAccessWarning,
      publicAccessAllowed: process.env.LIFEOS_ALLOW_PUBLIC === "1",
      publicSetupRisk: publicAccessWarning && securityDiagnostics.overall !== "ok",
      publicRisk: {
        overall: securityDiagnostics.publicMode ? securityDiagnostics.overall : "ok",
        items: publicRiskItems.map((item) => ({
          id: item.id,
          label: item.label,
          status: item.status,
          message: item.message,
          action: item.action,
        })),
      },
      timestamp: Date.now(),
    });
  });
}
