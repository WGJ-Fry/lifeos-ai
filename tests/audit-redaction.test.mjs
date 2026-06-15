// @ts-nocheck
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("audit log metadata is redacted before API-style reads", async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "lifeos-audit-redaction-"));
  const oldDataDir = process.env.LIFEOS_DATA_DIR;
  process.env.LIFEOS_DATA_DIR = dataDir;

  t.after(async () => {
    if (oldDataDir === undefined) delete process.env.LIFEOS_DATA_DIR;
    else process.env.LIFEOS_DATA_DIR = oldDataDir;
    await rm(dataDir, { recursive: true, force: true });
  });

  const auditModule = await import(`../server/audit.ts?test=${Date.now()}`);
  auditModule.insertAuditLog("sensitive_test", "test", "https://user:password@example.com/mobile/pair?token=bind_secret#fragment", {
    apiKey: "sk-live-secret",
    callbackUrl: "https://example.com/callback?token=query-secret#debug",
    localFile: "/Users/example/private/lifeos.db",
    command: "PUBLIC_BASE_URL=https://user:password@example.com/lifeos?token=query-secret#debug npm run start",
    nested: {
      token: "device-token-secret",
      publicLabel: "safe-label",
      backupPath: "/Users/example/private/lifeos.db",
    },
    items: [
      { authorization: "Bearer abc", count: 2 },
      { ciphertext: "encrypted-value" },
    ],
  });

  const dbModule = await import(`../server/db.ts?audit-redaction-db=${Date.now()}`);
  const [{ targetId: rawTargetId, metadataJson: rawMetadataJson }] = dbModule.db.prepare("SELECT target_id as targetId, metadata_json as metadataJson FROM audit_logs ORDER BY created_at DESC LIMIT 1").all();
  const rawSerialized = `${rawTargetId || ""}${rawMetadataJson || ""}`;
  assert.equal(rawTargetId, "https://example.com/mobile/pair?[redacted]#[redacted]");
  assert.equal(rawSerialized.includes("sk-live-secret"), false);
  assert.equal(rawSerialized.includes("query-secret"), false);
  assert.equal(rawSerialized.includes("bind_secret"), false);
  assert.equal(rawSerialized.includes("user:password"), false);
  assert.equal(rawSerialized.includes("/Users/example"), false);

  const [log] = auditModule.listAuditLogs(1);
  assert.equal(log.targetId, "https://example.com/mobile/pair?[redacted]#[redacted]");
  assert.equal(log.metadataJson.apiKey, "[redacted]");
  assert.equal(log.metadataJson.callbackUrl, "https://example.com/callback?[redacted]#[redacted]");
  assert.equal(log.metadataJson.localFile, "[local-path]");
  assert.equal(log.metadataJson.command, "PUBLIC_BASE_URL=https://example.com/lifeos?[redacted]#[redacted] npm run start");
  assert.equal(log.metadataJson.nested.token, "[redacted]");
  assert.equal(log.metadataJson.nested.backupPath, "[redacted]");
  assert.equal(log.metadataJson.nested.publicLabel, "safe-label");
  assert.equal(log.metadataJson.items[0].authorization, "[redacted]");
  assert.equal(log.metadataJson.items[0].count, 2);
  assert.equal(log.metadataJson.items[1].ciphertext, "[redacted]");
  assert.equal(JSON.stringify(log).includes("sk-live-secret"), false);
  assert.equal(JSON.stringify(log).includes("query-secret"), false);
  assert.equal(JSON.stringify(log).includes("bind_secret"), false);
  assert.equal(JSON.stringify(log).includes("user:password"), false);
  assert.equal(JSON.stringify(log).includes("/Users/example"), false);
});
