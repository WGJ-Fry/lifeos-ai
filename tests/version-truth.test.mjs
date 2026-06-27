import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("version truth check keeps public docs aligned with current release facts", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const publicVersion = packageJson.version.includes("-") && packageJson.version.endsWith(".0")
    ? packageJson.version.slice(0, -2)
    : packageJson.version;
  const releaseTag = `v${publicVersion}`;
  const result = spawnSync(process.execPath, ["scripts/check-version-truth.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, new RegExp(`Version truth passed for ${releaseTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(result.stdout, /English README keeps the current alpha limits visible/);
  assert.match(result.stdout, /Chinese README keeps the current alpha limits visible/);
  assert.match(result.stdout, /version roadmap separates shipped, next, and future work/);
  assert.match(result.stdout, /release promotion guard is available/);
});
