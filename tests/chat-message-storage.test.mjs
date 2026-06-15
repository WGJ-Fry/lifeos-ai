import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAT_MESSAGES_STORAGE_KEY,
  defaultChatMessages,
  loadStoredChatMessages,
  parseStoredChatMessages,
  persistStoredChatMessages,
} from "../src/services/chatMessageStorage.ts";

test("chat message storage falls back when local cache is missing or corrupted", () => {
  assert.deepEqual(parseStoredChatMessages(null), defaultChatMessages);
  assert.deepEqual(parseStoredChatMessages("{bad json"), defaultChatMessages);
  assert.deepEqual(parseStoredChatMessages("[]"), defaultChatMessages);
  assert.deepEqual(parseStoredChatMessages(JSON.stringify([{ role: "admin", parts: [] }])), defaultChatMessages);
});

test("chat message storage keeps valid cached messages and filters malformed entries", () => {
  const messages = parseStoredChatMessages(JSON.stringify([
    { role: "user", parts: [{ text: "hello" }] },
    { role: "model", parts: [{ text: "world" }], widget: "notes", widgetArgs: { id: 1 } },
    { role: "model", parts: [] },
    { role: "user", parts: [{ text: 42 }] },
  ]));

  assert.equal(messages.length, 2);
  assert.equal(messages[0].parts[0].text, "hello");
  assert.equal(messages[1].widget, "notes");
});

test("chat message storage tolerates browser storage read and write failures", () => {
  const brokenReader = {
    getItem() {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(loadStoredChatMessages(brokenReader), defaultChatMessages);

  const brokenWriter = {
    setItem() {
      throw new Error("quota");
    },
  };
  const failed = persistStoredChatMessages(defaultChatMessages, brokenWriter);
  assert.equal(failed.ok, false);
});

test("chat message storage writes to the stable local cache key", () => {
  const writes = new Map();
  const storage = {
    setItem(key, value) {
      writes.set(key, value);
    },
  };

  const result = persistStoredChatMessages([{ role: "user", parts: [{ text: "persist me" }] }], storage);
  assert.equal(result.ok, true);
  assert.equal(JSON.parse(writes.get(CHAT_MESSAGES_STORAGE_KEY))[0].parts[0].text, "persist me");
});
