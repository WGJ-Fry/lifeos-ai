import assert from "node:assert/strict";
import test from "node:test";
import { readLocalState, writeLocalState } from "../src/hooks/useSyncedClientState.ts";

function withLocalStorage(storage, run) {
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage;
  try {
    run();
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
}

test("synced client state reads primitive and structured local fallbacks safely", () => {
  withLocalStorage({
    getItem(key) {
      return {
        text: "plain",
        bool: "true",
        count: "7",
        object: JSON.stringify({ ok: true }),
      }[key] ?? null;
    },
    setItem() {},
    removeItem() {},
  }, () => {
    assert.equal(readLocalState("text", "fallback"), "plain");
    assert.equal(readLocalState("bool", false), true);
    assert.equal(readLocalState("count", 0), 7);
    assert.deepEqual(readLocalState("object", {}), { ok: true });
  });
});

test("synced client state falls back when storage is corrupt or unavailable", () => {
  withLocalStorage({
    getItem(key) {
      if (key === "blocked") throw new Error("blocked");
      if (key === "count") return "NaN";
      return "{bad json";
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("blocked");
    },
  }, () => {
    assert.deepEqual(readLocalState("badObject", { ok: false }), { ok: false });
    assert.equal(readLocalState("count", 3), 3);
    assert.equal(readLocalState("blocked", "fallback"), "fallback");
    assert.doesNotThrow(() => writeLocalState("blocked", { value: true }));
    assert.doesNotThrow(() => writeLocalState("lifeos_byok_key", "secret"));
  });
});

test("synced client state writes primitives and objects to local cache when available", () => {
  const writes = new Map();
  withLocalStorage({
    getItem() {
      return null;
    },
    setItem(key, value) {
      writes.set(key, value);
    },
    removeItem(key) {
      writes.set(key, null);
    },
  }, () => {
    writeLocalState("name", "LifeOS");
    writeLocalState("enabled", true);
    writeLocalState("settings", { theme: "dark" });
    writeLocalState("lifeos_byok_key", "secret");
  });

  assert.equal(writes.get("name"), "LifeOS");
  assert.equal(writes.get("enabled"), "true");
  assert.equal(JSON.parse(writes.get("settings")).theme, "dark");
  assert.equal(writes.get("lifeos_byok_key"), null);
});
