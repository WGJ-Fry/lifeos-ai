// @ts-nocheck
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("remote validation report persists sanitized remote smoke results", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "lifeos-remote-validation-"));
  try {
    const output = execFileSync(process.execPath, ["--import", "tsx", "-e", `
      const { saveRemoteValidationReport, getRemoteValidationReport } = await import("./server/remoteValidationReport.ts");
      saveRemoteValidationReport({
        label: "Cloudflare",
        baseUrl: "https://user:pass@example.test/lifeos?token=secret#debug",
        result: {
          ok: true,
          status: 200,
          url: "https://user:pass@example.test/lifeos/api/v1/health?token=secret#debug",
          latencyMs: 42,
          steps: [
            { id: "health", ok: true, status: 200, url: "https://user:pass@example.test/lifeos/api/v1/health?token=secret#debug", latencyMs: 10 },
            { id: "mobile-shell", ok: true, status: 200, url: "https://example.test/lifeos/mobile/chat?token=secret", latencyMs: 12 },
          ],
        },
      }, { type: "test", id: "runner" });
      const report = getRemoteValidationReport();
      process.stdout.write(JSON.stringify(report));
    `], {
      cwd: process.cwd(),
      env: { ...process.env, LIFEOS_DATA_DIR: dataDir },
      encoding: "utf8",
    });
    const report = JSON.parse(output);
    assert.equal(report.ok, true);
    assert.equal(report.passed, 2);
    assert.equal(report.total, 2);
    assert.equal(report.baseUrl, "https://example.test/lifeos");
    assert.equal(report.url, "https://example.test/lifeos/api/v1/health");
    assert.equal(report.steps[0].url, "https://example.test/lifeos/api/v1/health");
    assert.doesNotMatch(output, /user:|:pass|token=secret|#debug/);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
