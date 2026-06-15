// @ts-nocheck
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("data export redaction covers secrets, urls, bearer tokens, and local paths", async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "lifeos-data-export-redaction-"));
  process.env.LIFEOS_DATA_DIR = dataDir;
  t.after(async () => {
    await rm(dataDir, { recursive: true, force: true });
    delete process.env.LIFEOS_DATA_DIR;
  });

  const lifecycle = await import(`../server/dataLifecycle.ts?data-export-redaction=${Date.now()}`);
  const redacted = lifecycle.redactDataExportValue({
    apiKey: "sk-live-should-not-leak",
    api_key: "AIzaSy-should-not-leak",
    password: "admin-password",
    passphrase: "backup passphrase",
    secret: "generic-secret",
    authorization: "Bearer abc.def.secret",
    cookie: "lifeos_admin=session-secret",
    iv: "base64-iv",
    authTag: "auth-tag-secret",
    auth_tag: "auth-tag-secret-2",
    privateKey: "private-key-secret",
    backupPath: "/Users/example/private/lifeos.db",
    callbackUrl: "https://user:password@example.com/callback?token=query-secret#debug",
    command: "Authorization: Bearer abc123 PUBLIC_BASE_URL=https://user:password@example.com/lifeos?token=query-secret#debug /Users/example/private/lifeos.db",
    nested: {
      token: "device-token-secret",
      safeCount: 2,
      visible: true,
      visibility: "private-but-not-an-iv-field",
    },
    items: [
      { refresh_token: "refresh-secret", status: 200 },
      { ciphertext: "encrypted-secret", note: "C:\\Users\\example\\AppData\\lifeos.db" },
    ],
  });

  assert.equal(redacted.apiKey, "[redacted]");
  assert.equal(redacted.api_key, "[redacted]");
  assert.equal(redacted.password, "[redacted]");
  assert.equal(redacted.passphrase, "[redacted]");
  assert.equal(redacted.secret, "[redacted]");
  assert.equal(redacted.authorization, "[redacted]");
  assert.equal(redacted.cookie, "[redacted]");
  assert.equal(redacted.iv, "[redacted]");
  assert.equal(redacted.authTag, "[redacted]");
  assert.equal(redacted.auth_tag, "[redacted]");
  assert.equal(redacted.privateKey, "[redacted]");
  assert.equal(redacted.backupPath, "[redacted]");
  assert.equal(redacted.callbackUrl, "https://example.com/callback?[redacted]#[redacted]");
  assert.equal(redacted.command.includes("abc123"), false);
  assert.equal(redacted.command.includes("query-secret"), false);
  assert.equal(redacted.command.includes("/Users/example"), false);
  assert.equal(redacted.nested.token, "[redacted]");
  assert.equal(redacted.nested.safeCount, 2);
  assert.equal(redacted.nested.visible, true);
  assert.equal(redacted.nested.visibility, "private-but-not-an-iv-field");
  assert.equal(redacted.items[0].refresh_token, "[redacted]");
  assert.equal(redacted.items[0].status, 200);
  assert.equal(redacted.items[1].ciphertext, "[redacted]");
  assert.equal(redacted.items[1].note, "[local-path]");

  const serialized = JSON.stringify(redacted);
  for (const secret of [
    "sk-live-should-not-leak",
    "AIzaSy-should-not-leak",
    "admin-password",
    "backup passphrase",
    "generic-secret",
    "session-secret",
    "base64-iv",
    "auth-tag-secret",
    "private-key-secret",
    "device-token-secret",
    "refresh-secret",
    "encrypted-secret",
    "query-secret",
    "/Users/example",
    "C:\\Users\\example",
  ]) {
    assert.equal(serialized.includes(secret), false, `${secret} should not leak in data export redaction`);
  }
});
