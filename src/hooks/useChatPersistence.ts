import { useCallback, useRef } from "react";
import type { Message } from "../types";
import { createChatSession, getChatSessionMessages, getStoredDeviceCredentialAsync, saveChatMessage } from "../services/lifeosApi";
import { loadActiveChatSessionId, saveActiveChatSessionId } from "../services/chatSessionStorage";
import {
  enqueueOfflineMessage,
  type EnqueueOfflineMessageOptions,
  getOfflineMessagesReadyToSync,
  markOfflineMessagesSynced,
  markOfflineMessageFailed,
  markOfflineMessageSyncing,
  recoverStaleOfflineMessages,
} from "../services/offlineMessageQueue";
import { getNetworkStatus } from "../services/networkStatus";

async function buildOfflineMessageSource(): Promise<EnqueueOfflineMessageOptions["source"]> {
  const credential = await getStoredDeviceCredentialAsync().catch(() => null);
  const network = getNetworkStatus();
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  return {
    client: path.startsWith("/mobile") ? "mobile" : path ? "desktop" : "unknown",
    deviceName: credential?.device.name,
    deviceIdHint: credential?.device.id ? credential.device.id.slice(-8) : undefined,
    authMethod: credential?.authMethod || (credential?.accessToken ? "token" : undefined),
    path,
    online: network.online,
    networkQuality: network.quality,
    effectiveType: network.effectiveType,
  };
}

export function useChatPersistence() {
  const chatSessionIdRef = useRef<string | null>(null);
  const chatSessionPromiseRef = useRef<Promise<string> | null>(null);

  const createAndUseChatSession = useCallback(async () => {
    const { session } = await createChatSession("JARVIS Main Session");
    saveActiveChatSessionId(session.id);
    chatSessionIdRef.current = session.id;
    chatSessionPromiseRef.current = Promise.resolve(session.id);
    return session.id;
  }, []);

  const ensureChatSessionId = useCallback(async () => {
    if (chatSessionIdRef.current) return chatSessionIdRef.current;
    if (chatSessionPromiseRef.current) return chatSessionPromiseRef.current;

    chatSessionPromiseRef.current = (async () => {
      const savedSessionId = loadActiveChatSessionId();
      if (savedSessionId) {
        chatSessionIdRef.current = savedSessionId;
        return savedSessionId;
      }

      return createAndUseChatSession();
    })();

    return chatSessionPromiseRef.current;
  }, [createAndUseChatSession]);

  const loadMessagesFromCore = useCallback(async () => {
    const sessionId = await ensureChatSessionId();
    return getChatSessionMessages(sessionId);
  }, [ensureChatSessionId]);

  const persistMessageToCore = useCallback(async (message: Message) => {
    try {
      const sessionId = await ensureChatSessionId();
      await saveChatMessage(sessionId, message);
    } catch (error) {
      console.warn("Failed to persist chat message, retrying with a fresh session:", error);
      try {
        const sessionId = await createAndUseChatSession();
        await saveChatMessage(sessionId, message);
      } catch (retryError) {
        console.warn("Failed to persist chat message:", retryError);
        enqueueOfflineMessage(message, { source: await buildOfflineMessageSource() });
      }
    }
  }, [createAndUseChatSession, ensureChatSessionId]);

  const flushOfflineMessages = useCallback(async () => {
    recoverStaleOfflineMessages();
    const queue = getOfflineMessagesReadyToSync();
    if (queue.length === 0) return 0;

    const sessionId = await ensureChatSessionId();
    const syncedIds: string[] = [];
    for (const item of queue) {
      try {
        markOfflineMessageSyncing(item.id);
        await saveChatMessage(sessionId, item.message, {
          mutationId: item.mutationId,
          idempotencyKey: item.idempotencyKey,
          clientSequence: item.clientSequence,
          sourceVersion: item.sourceVersion,
          queuedAt: item.queuedAt,
        });
        syncedIds.push(item.id);
      } catch (error) {
        console.warn("Failed to flush offline chat message:", error);
        markOfflineMessageFailed(item.id, error);
        break;
      }
    }

    markOfflineMessagesSynced(syncedIds);
    return syncedIds.length;
  }, [ensureChatSessionId]);

  return {
    createAndUseChatSession,
    flushOfflineMessages,
    loadMessagesFromCore,
    persistMessageToCore,
  };
}
