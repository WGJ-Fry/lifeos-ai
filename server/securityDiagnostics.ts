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
      label: "管理员认证",
      status: isAdminConfigured() ? "ok" : "critical",
      message: isAdminConfigured() ? "管理员认证已配置。" : "管理员认证尚未配置。",
      action: "先完成首次启动向导，设置管理员密码。",
    },
    {
      id: "password",
      label: "管理员密码强度",
      status: !publicMode ? (passwordPolicy?.meetsPolicy === false ? "warning" : "ok") : passwordPolicy?.meetsPolicy ? "ok" : "critical",
      message: passwordPolicy
        ? passwordPolicy.meetsPolicy
          ? "密码策略已通过。"
          : "当前密码策略偏弱。"
        : publicMode
          ? "未找到密码强度摘要，无法证明公网模式下密码足够强。"
          : "本机模式未发现密码强度阻断项。",
      action: passwordPolicy?.meetsPolicy ? "无需处理。" : "建议重设为 12 位以上，并混合短语、数字或符号。",
    },
    {
      id: "https",
      label: "公网 HTTPS",
      status: !publicMode ? "ok" : publicBaseUrl.startsWith("https://") ? "ok" : "critical",
      message: !publicMode
        ? "当前未配置公网地址。"
        : publicBaseUrl.startsWith("https://")
          ? "公网地址使用 HTTPS。"
          : "公网/异地访问没有可信 HTTPS 地址。",
      action: "使用 Cloudflare Tunnel、Tailscale 或可信 HTTPS 反向代理。",
    },
    {
      id: "publicOptIn",
      label: "公网显式授权",
      status: !publicMode || process.env.LIFEOS_ALLOW_PUBLIC === "1" ? "ok" : "critical",
      message: !publicMode ? "未开启公网/LAN 暴露。" : process.env.LIFEOS_ALLOW_PUBLIC === "1" ? "已显式允许公网/LAN 模式。" : "缺少 LIFEOS_ALLOW_PUBLIC=1。",
      action: "只有确认处于可信网络或隧道后才设置 LIFEOS_ALLOW_PUBLIC=1。",
    },
    {
      id: "ai",
      label: "AI Provider",
      status: aiConfigured ? "ok" : "warning",
      message: aiConfigured ? "至少一个 AI Provider 已配置。" : "还没有配置 AI Provider。",
      action: "在系统设置或首次启动向导中配置 AI Key。",
    },
    {
      id: "backup",
      label: "初始备份",
      status: backupCount > 0 ? "ok" : publicMode ? "critical" : "warning",
      message: backupCount > 0 ? `已有 ${backupCount} 份备份。` : "尚未创建 SQLite 备份。",
      action: "开启公网、升级或迁移前先创建备份。",
    },
    {
      id: "backupSchedule",
      label: "自动备份计划",
      status: backupSchedule.enabled ? "ok" : publicMode ? "critical" : "warning",
      message: backupSchedule.enabled
        ? `自动备份已开启，每 ${backupSchedule.intervalHours} 小时执行一次。`
        : "尚未开启自动备份计划。",
      action: backupSchedule.enabled ? "无需处理。" : "在设置的备份与恢复中开启自动备份，避免长期使用后忘记备份。",
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
