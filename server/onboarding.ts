import { listAiProviderStatuses } from "./appSecrets";
import { getClientState, setClientState } from "./clientState";
import { listBackups } from "./db";
import { getDevices } from "./devices";
import { getSecurityDiagnostics } from "./securityDiagnostics";

const ONBOARDING_COMPLETED_KEY = "lifeos_onboarding_completed";

export type OnboardingStepId = "ai" | "backup" | "device" | "security";

export type OnboardingStep = {
  id: OnboardingStepId;
  label: string;
  done: boolean;
  actionPath: string;
  message: string;
};

export function getOnboardingStatus() {
  const providers = listAiProviderStatuses();
  const backups = listBackups();
  const devices = getDevices();
  const security = getSecurityDiagnostics();
  const aiConfigured = providers.some((provider) => provider.configured);
  const hasBackup = backups.length > 0;
  const hasDevice = devices.some((device) => device.status !== "revoked");
  const securityReady = security.overall !== "critical";
  const completedState = getClientState(ONBOARDING_COMPLETED_KEY)?.value as { completedAt?: number } | undefined;

  const steps: OnboardingStep[] = [
    {
      id: "ai",
      label: "配置 AI Provider",
      done: aiConfigured,
      actionPath: "/admin/onboarding",
      message: aiConfigured ? "至少一个 AI Provider 已配置。" : "先配置 Gemini、OpenAI、OpenRouter 或本地模型。",
    },
    {
      id: "backup",
      label: "创建初始备份",
      done: hasBackup,
      actionPath: "/admin/onboarding",
      message: hasBackup ? `已有 ${backups.length} 份备份。` : "首次使用前创建 SQLite 快照，方便回滚。",
    },
    {
      id: "device",
      label: "绑定手机端",
      done: hasDevice,
      actionPath: "/admin/devices/pair",
      message: hasDevice ? `已绑定 ${devices.filter((device) => device.status !== "revoked").length} 台设备。` : "绑定手机后才能把手机端作为日常入口。",
    },
    {
      id: "security",
      label: "安全自检",
      done: securityReady,
      actionPath: "/admin/settings",
      message: securityReady ? "没有阻断级安全风险。" : "仍有阻断级安全风险需要处理。",
    },
  ];

  const completed = steps.every((step) => step.done);
  return {
    steps,
    completed,
    completedAt: completed ? completedState?.completedAt || null : null,
    required: !completed || !completedState?.completedAt,
    securityOverall: security.overall,
    nextPath: completed ? "/admin/dashboard" : "/admin/onboarding",
  };
}

export function markOnboardingComplete(actor: { type: string; id: string }) {
  const status = getOnboardingStatus();
  if (!status.completed) {
    const error = new Error("Onboarding is not complete yet");
    (error as any).statusCode = 409;
    (error as any).details = status.steps;
    throw error;
  }
  const completedAt = Date.now();
  setClientState(ONBOARDING_COMPLETED_KEY, { completedAt }, actor);
  return {
    ...getOnboardingStatus(),
    completedAt,
    required: false,
  };
}
