import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVE_CHAT_SESSION_STORAGE_KEY,
  clearActiveChatSessionId,
  loadActiveChatSessionId,
  saveActiveChatSessionId,
} from "../src/services/chatSessionStorage.ts";

test("chat session storage reads, writes, and clears the active session id", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };

  assert.equal(loadActiveChatSessionId(storage), null);
  assert.equal(saveActiveChatSessionId("chat_123", storage), true);
  assert.equal(values.get(ACTIVE_CHAT_SESSION_STORAGE_KEY), "chat_123");
  assert.equal(loadActiveChatSessionId(storage), "chat_123");
  assert.equal(clearActiveChatSessionId(storage), true);
  assert.equal(loadActiveChatSessionId(storage), null);
});

test("chat session storage ignores blank ids and unavailable browser storage", () => {
  assert.equal(loadActiveChatSessionId({ getItem: () => "   " }), null);

  const brokenStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };

  assert.equal(loadActiveChatSessionId(brokenStorage), null);
  assert.equal(saveActiveChatSessionId("chat_456", brokenStorage), false);
  assert.equal(clearActiveChatSessionId(brokenStorage), false);
});
