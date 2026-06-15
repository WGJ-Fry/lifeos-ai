import type { Message } from "../types";
import { getAuthHeaders } from "./lifeosApi";

export type RuntimeSettings = {
  providerId?: string;
  modelEngine: unknown;
  byokProvider?: unknown;
  ttsVoice: unknown;
  proxyNode: string;
  routeMode: unknown;
};

export type ChatCompletionInput = RuntimeSettings & {
  message: string;
  history: Array<Pick<Message, "role" | "parts">>;
  memories: unknown[];
};

export type ChatCompletionResponse = {
  text: string;
  stateChanges?: Array<Record<string, any>>;
  provider?: string;
  model?: string;
};

export type GeneratedAppResponse = {
  appName: string;
  uiCode: string;
};

export async function parseAiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (response.ok) return data;

  const message =
    data?.code === "AI_CONFIG_MISSING"
      ? data?.message || "AI 服务还没有配置好。请在电脑管理端打开“系统设置”，为当前模型配置对应的 Provider Key。"
      : data?.message || data?.error || "网络好像不太通畅，请稍后再试。";

  throw new Error(message);
}

export async function requestChatCompletion(input: ChatCompletionInput): Promise<ChatCompletionResponse> {
  const body = JSON.stringify(input);
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders("POST", "/api/chat", body)) },
    body,
  });

  return parseAiResponse(response);
}

export async function generateCustomApp(appName: string, description: string): Promise<GeneratedAppResponse> {
  const body = JSON.stringify({ appName, description });
  const response = await fetch("/api/generate_app", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders("POST", "/api/generate_app", body)) },
    body,
  });

  return parseAiResponse(response);
}
