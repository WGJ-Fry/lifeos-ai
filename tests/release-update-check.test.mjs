import assert from "node:assert/strict";
import test from "node:test";

function jsonResponse(value, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    async json() {
      return value;
    },
  };
}

test("release update check detects newer public prerelease and checksum asset", async () => {
  const module = await import(`../server/releaseUpdateCheck.ts?case=newer-${Date.now()}`);
  const result = await module.checkReleaseUpdate({
    now: new Date("2026-06-27T00:00:00.000Z"),
    fetchImpl: async () => jsonResponse([
      {
        tag_name: "v0.1.3-alpha",
        name: "Old alpha",
        html_url: "https://github.com/WGJ-Fry/lifeos-ai/releases/tag/v0.1.3-alpha",
        draft: false,
        prerelease: true,
        published_at: "2026-06-26T00:00:00.000Z",
        assets: [],
      },
      {
        tag_name: "v0.1.5-alpha",
        name: "Next alpha",
        html_url: "https://github.com/WGJ-Fry/lifeos-ai/releases/tag/v0.1.5-alpha",
        draft: false,
        prerelease: true,
        published_at: "2026-06-28T00:00:00.000Z",
        assets: [
          { name: "SHA256SUMS", size: 200, browser_download_url: "https://example.com/SHA256SUMS" },
          { name: "LifeOS.AI-0.1.5-alpha.0-arm64-unsigned.zip", size: 1200, browser_download_url: "https://example.com/app.zip" },
          { name: "LifeOS.AI.Setup.0.1.5-alpha.0.exe", size: 1000, browser_download_url: "https://example.com/app.exe" },
          { name: "LifeOS.AI-0.1.5-alpha.0.AppImage", size: 1100, browser_download_url: "https://example.com/app.AppImage" },
        ],
      },
      {
        tag_name: "v9.9.9-alpha",
        draft: true,
        prerelease: true,
        assets: [],
      },
    ]),
    platform: "darwin",
  });

  assert.equal(module.packageVersionToReleaseTag("0.1.4-alpha.0"), "v0.1.4-alpha");
  assert.equal(module.compareReleaseTags("v0.1.5-alpha", "v0.1.4-alpha") > 0, true);
  assert.equal(result.status, "update-available");
  assert.equal(result.updateAvailable, true);
  assert.equal(result.current.tag, "v0.1.4-alpha");
  assert.equal(result.latest.tag, "v0.1.5-alpha");
  assert.equal(result.latest.checksumAsset.name, "SHA256SUMS");
  assert.equal(result.manualUpdateRequired, true);
  assert.equal(result.autoUpdateEnabled, false);
  assert.equal(result.manualUpdatePlan.platform, "macos");
  assert.equal(result.manualUpdatePlan.assetName, "LifeOS.AI-0.1.5-alpha.0-arm64-unsigned.zip");
  assert.equal(result.manualUpdatePlan.assetUrl, "https://example.com/app.zip");
  assert.equal(result.manualUpdatePlan.checksumUrl, "https://example.com/SHA256SUMS");
  assert.match(result.manualUpdatePlan.checksumCommand, /shasum -a 256/);
  assert.match(result.manualUpdatePlan.installCommand, /Applications/);
  assert.deepEqual(result.manualUpdatePlan.steps.map((step) => step.id), ["backup", "download", "checksum", "install", "restart"]);
  assert.match(result.recommendations.join("\n"), /Verify SHA256SUMS/);
});

test("release update check reports up-to-date and tolerates API failures", async () => {
  const module = await import(`../server/releaseUpdateCheck.ts?case=current-${Date.now()}`);
  const current = await module.checkReleaseUpdate({
    fetchImpl: async () => jsonResponse([
      {
        tag_name: "v0.1.4-alpha",
        name: "Current alpha",
        html_url: "https://github.com/WGJ-Fry/lifeos-ai/releases/tag/v0.1.4-alpha",
        draft: false,
        prerelease: true,
        published_at: "2026-06-27T00:00:00.000Z",
        assets: [{ name: "SHA256SUMS", size: 200, browser_download_url: "https://example.com/SHA256SUMS" }],
      },
    ]),
  });
  assert.equal(current.status, "up-to-date");
  assert.equal(current.updateAvailable, false);
  assert.equal(current.latest.tag, "v0.1.4-alpha");

  const failed = await module.checkReleaseUpdate({
    fetchImpl: async () => jsonResponse({ message: "rate limited" }, false, 403),
  });
  assert.equal(failed.status, "error");
  assert.equal(failed.updateAvailable, false);
  assert.equal(failed.latest, null);
  assert.match(failed.reason, /release_api_http_403/);
});
