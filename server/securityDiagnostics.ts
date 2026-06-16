import { getClientState } from "./clientState";
import { isAdminConfigured } from "./auth";
import { listAiProviderStatuses } from "./appSecrets";
import { listBackups } from "./db";
import { getConfiguredPublicBaseUrl } from "./publicBaseUrl";
import { getBackupSchedule } from "./backupSchedule";

export type SecurityCheckItem = {
  id: string;
  label: string;
  status: "ok" | "warning" | "critical";
  message: string;
  action: string;
};

const weakPasswordSamples = new Set(["password", "password123", "12345678", "123456789", "lifeos123", "admin123", "changeme"]);

export function evaluatePasswordPolicy(password: string) {
  const normalized = password.trim().toLowerCase();
  const lengthOk = password.length >= 12;
  const hasVariety = [/[a-z]/i, /\d/, /[^a-z0-9\s]/i, /\s/].filter((pattern) => pattern.test(password)).length >= 2;
  const notCommon = !weakPasswordSamples.has(normalized);
  return {
    meetsPolicy: lengthOk && hasVariety && notCommon,
    lengthBucket: password.length >= 16 ? "16+" : password.length >= 12 ? "12-15" : "8-11",
    hasVariety,
    notCommon,
    checkedAt: Date.now(),
  };
}

export function getSecurityDiagnostics() {
  const publicBaseUrl = getConfiguredPublicBaseUrl();
  const host = process.env.LIFEOS_HOST || "127.0.0.1";
  const publicMode = Boolean(publicBaseUrl) || host === "0.0.0.0";
  const passwordPolicy = getClientState("lifeos_admin_password_policy")?.value as ReturnType<typeof evaluatePasswordPolicy> | undefined;
  const aiConfigured = listAiProviderStatuses().some((provider) => provider.configured);
  const backupCount = listBackups().length;
  const backupSchedule = getBackupSchedule();

  const items: SecurityCheckItem[] = [
    {
      id: "admin",
      label: "Admin Authentication",
      status: isAdminConfigured() ? "ok" : "critical",
      message: isAdminConfigured() ? "Admin authentication is configured." : "Admin authentication is not configured yet.",
      action: "Complete the first-run guide and set an admin password first.",
    },
    {
      id: "password",
      label: "Admin Password Strength",
      status: !publicMode ? (passwordPolicy?.meetsPolicy === false ? "warning" : "ok") : passwordPolicy?.meetsPolicy ? "ok" : "critical",
      message: passwordPolicy
        ? passwordPolicy.meetsPolicy
          ? "Password policy passed."
          : "Current password policy is weak."
        : publicMode
          ? "No password strength summary found, so public mode cannot prove the password is strong enough."
          : "No blocking password strength item found in local mode.",
      action: passwordPolicy?.meetsPolicy ? "No action needed." : "Reset to at least 12 characters and mix phrases, numbers, or symbols.",
    },
    {
      id: "https",
      label: "Public HTTPS",
      status: !publicMode ? "ok" : publicBaseUrl.startsWith("https://") ? "ok" : "critical",
      message: !publicMode
        ? "No public address is configured."
        : publicBaseUrl.startsWith("https://")
          ? "Public address uses HTTPS."
          : "Public/remote access has no trusted HTTPS address.",
      action: "Use Cloudflare Tunnel, Tailscale, or a trusted HTTPS reverse proxy.",
    },
    {
      id: "publicOptIn",
      label: "Explicit Public Access Approval",
      status: !publicMode || process.env.LIFEOS_ALLOW_PUBLIC === "1" ? "ok" : "critical",
      message: !publicMode ? "Public/LAN exposure is not enabled." : process.env.LIFEOS_ALLOW_PUBLIC === "1" ? "Public/LAN mode is explicitly allowed." : "Missing LIFEOS_ALLOW_PUBLIC=1.",
      action: "Set LIFEOS_ALLOW_PUBLIC=1 only after confirming a trusted network or tunnel.",
    },
    {
      id: "ai",
      label: "AI Provider",
      status: aiConfigured ? "ok" : "warning",
      message: aiConfigured ? "At least one AI provider is configured." : "No AI provider is configured yet.",
      action: "Configure an AI Key in System Settings or the first-run guide.",
    },
    {
      id: "backup",
      label: "Initial Backup",
      status: backupCount > 0 ? "ok" : publicMode ? "critical" : "warning",
      message: backupCount > 0 ? `${backupCount} backup(s) available.` : "No SQLite backup has been created.",
      action: "Create a backup before public access, upgrade, or migration.",
    },
    {
      id: "backupSchedule",
      label: "Automatic Backup Schedule",
      status: backupSchedule.enabled ? "ok" : publicMode ? "critical" : "warning",
      message: backupSchedule.enabled
        ? `Automatic backups are enabled every ${backupSchedule.intervalHours} hour(s).`
        : "Automatic backups are not enabled yet.",
      action: backupSchedule.enabled ? "No action needed." : "Enable automatic backups in Backup & Restore settings to avoid forgetting backups during long-term use.",
    },
  ];

  const hasCritical = items.some((item) => item.status === "critical");
  const hasWarning = items.some((item) => item.status === "warning");
  return {
    publicMode,
    overall: hasCritical ? "critical" as const : hasWarning ? "warning" as const : "ok" as const,
    items,
  };
}
