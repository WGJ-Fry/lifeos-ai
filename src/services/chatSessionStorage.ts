export const ACTIVE_CHAT_SESSION_STORAGE_KEY = "lifeos_active_chat_session_id";

export function loadActiveChatSessionId(storage: Pick<Storage, "getItem"> = localStorage) {
  try {
    const sessionId = storage.getItem(ACTIVE_CHAT_SESSION_STORAGE_KEY);
    return sessionId && sessionId.trim() ? sessionId : null;
  } catch {
    return null;
  }
}

export function saveActiveChatSessionId(sessionId: string, storage: Pick<Storage, "setItem"> = localStorage) {
  try {
    storage.setItem(ACTIVE_CHAT_SESSION_STORAGE_KEY, sessionId);
    return true;
  } catch {
    return false;
  }
}

export function clearActiveChatSessionId(storage: Pick<Storage, "removeItem"> = localStorage) {
  try {
    storage.removeItem(ACTIVE_CHAT_SESSION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
