import type { Message } from "../types";

export const CHAT_MESSAGES_STORAGE_KEY = "lifeos_messages";

export const defaultChatMessages: Message[] = [
  {
    role: "model",
    parts: [
      {
        text: "早上好。我是 JARVIS 全能智能设计工坊系统。\n你可以随时将任意代码（tsx、vue、py、html 等）或 UI 截图拖入窗口，我将自动重定义或临时创造全新的交互控件！",
      },
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isMessage(value: unknown): value is Message {
  if (!isRecord(value)) return false;
  if (value.role !== "user" && value.role !== "model") return false;
  if (!Array.isArray(value.parts) || value.parts.length === 0) return false;
  return value.parts.every((part) => isRecord(part) && (part.text === undefined || typeof part.text === "string"));
}

export function parseStoredChatMessages(raw: string | null): Message[] {
  if (!raw) return defaultChatMessages;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultChatMessages;
    const messages = parsed.filter(isMessage);
    return messages.length > 0 ? messages : defaultChatMessages;
  } catch {
    return defaultChatMessages;
  }
}

export function loadStoredChatMessages(storage: Pick<Storage, "getItem"> = localStorage): Message[] {
  try {
    return parseStoredChatMessages(storage.getItem(CHAT_MESSAGES_STORAGE_KEY));
  } catch {
    return defaultChatMessages;
  }
}

export function persistStoredChatMessages(
  messages: Message[],
  storage: Pick<Storage, "setItem"> = localStorage,
): { ok: true } | { ok: false; error: unknown } {
  try {
    storage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
