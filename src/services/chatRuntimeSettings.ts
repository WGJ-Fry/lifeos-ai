import { getClientState, listMemories } from "./lifeosApi";
import type { AiProviderId } from "./lifeosApi";

const defaultMemories = [
  { id: "mem-1", title: "用户称呼与代词", content: "“先生/主人，男士，职场人士，讲话干脆直接不要罗嗦。”" },
  { id: "mem-2", title: "晨间常驻导航点", content: "“早晨常去的星巴克门店在南京西路110号。”" },
  { id: "mem-3", title: "UI审美偏好", content: "“喜爱深色系、Cyberpunk 以及极简的控制台风格，避免花哨色彩。”" },
];

function parseLocalJson<T>(key: string, fallback: T) {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

export function readLocalRuntimeValue<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    if (typeof fallback === "string") return raw as T;
    if (typeof fallback === "boolean") return (raw === "true") as T;
    if (typeof fallback === "number") {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed as T : fallback;
    }
    return fallback;
  }
}

export async function loadMemoriesForChat() {
  try {
    const data = await listMemories();
    if (data.memories.length > 0) {
      return data.memories.map((memory) => ({
        id: memory.id,
        title: memory.title,
        content: memory.content,
      }));
    }
  } catch (error) {
    console.warn("Failed to load server memories, falling back to local memories:", error);
  }

  return parseLocalJson("lifeos_memories", defaultMemories);
}

export async function loadRuntimeSettings() {
  const [providerId, modelEngine, byokProvider, ttsVoice, proxyEnabled, routeMode, selectedNodeId, proxyNodes] = await Promise.all([
    getClientState<AiProviderId>("lifeos_active_ai_provider", "gemini"),
    getClientState("lifeos_model_engine", readLocalRuntimeValue("lifeos_model_engine", "Gemini 2.0 Flash")),
    getClientState("lifeos_byok_provider", readLocalRuntimeValue("lifeos_byok_provider", "Google Gemini (推荐)")),
    getClientState("lifeos_tts_voice", readLocalRuntimeValue("lifeos_tts_voice", "Onyx (深沉星空男声)")),
    getClientState("lifeos_proxy_enabled", readLocalRuntimeValue("lifeos_proxy_enabled", false)),
    getClientState("lifeos_route_mode", readLocalRuntimeValue("lifeos_route_mode", "rule")),
    getClientState("lifeos_selected_node_id", readLocalRuntimeValue("lifeos_selected_node_id", "cn-hk")),
    getClientState<any[]>("lifeos_proxy_nodes", readLocalRuntimeValue("lifeos_proxy_nodes", [])),
  ]);

  let proxyNode = "核心本地 127.0.0.1 代理回路 (Direct)";
  if (proxyEnabled) {
    const activeNode = proxyNodes.find((node: any) => node.id === selectedNodeId);
    if (activeNode) {
      proxyNode = `${activeNode.name} (${activeNode.type}, 延迟: ${activeNode.delay}ms)`;
    }
  }

  return { providerId, modelEngine, byokProvider, ttsVoice, proxyNode, routeMode };
}
