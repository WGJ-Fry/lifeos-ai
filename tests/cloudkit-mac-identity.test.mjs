import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function readIdentity(dataDir) {
  const script = `
    const { runMigrations } = await import("./server/migrations.ts");
    runMigrations();
    const protocol = await import("./server/cloudKitChatProtocol.ts");
    const identity = await import("./server/cloudKitMacIdentity.ts");
    const unsigned = protocol.parseCloudKitChatResponsePayload({
      schemaVersion: 1,
      requestId: "123e4567-e89b-42d3-a456-426614174000",
      responseId: protocol.cloudKitChatResponseId("123e4567-e89b-42d3-a456-426614174000"),
      conversationId: "223e4567-e89b-42d3-a456-426614174000",
      assistantMessageId: "323e4567-e89b-42d3-a456-426614174000",
      status: "completed",
      text: "Identity continuity test.",
      requestContentHash: "a".repeat(64),
      startedAt: 1700000000000,
      completedAt: 1700000001000,
      updatedAt: 1700000001000,
    });
    const signed = identity.signCloudKitChatResponse(unsigned);
    protocol.verifyCloudKitChatResponseSignature(signed);
    process.stdout.write(JSON.stringify({
      fingerprint: signed.macPublicKeyFingerprint,
      publicKey: signed.macPublicKey,
      signatureValid: true,
    }));
  `;
  return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
    cwd: rootDir,
    env: { ...process.env, LIFEOS_DATA_DIR: dataDir },
    encoding: "utf8",
  });
}

test("CloudKit Mac response identity survives a process restart and remains verifiable", async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "ownorbit-cloudkit-mac-identity-"));
  try {
    const first = readIdentity(dataDir);
    const second = readIdentity(dataDir);
    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const firstIdentity = JSON.parse(first.stdout);
    const secondIdentity = JSON.parse(second.stdout);
    assert.match(firstIdentity.fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(firstIdentity.signatureValid, true);
    assert.deepEqual(secondIdentity, firstIdentity);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
