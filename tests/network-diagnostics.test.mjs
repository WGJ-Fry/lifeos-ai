// @ts-nocheck
import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("network diagnostics detects mocked Cloudflare and Tailscale CLIs", async (t) => {
  const binDir = await mkdtemp(path.join(tmpdir(), "lifeos-network-bin-"));
  const oldPath = process.env.PATH || "";
  const oldPort = process.env.LIFEOS_PORT;
  const oldHost = process.env.LIFEOS_HOST;

  t.after(async () => {
    process.env.PATH = oldPath;
    if (oldPort === undefined) delete process.env.LIFEOS_PORT;
    else process.env.LIFEOS_PORT = oldPort;
    if (oldHost === undefined) delete process.env.LIFEOS_HOST;
    else process.env.LIFEOS_HOST = oldHost;
    await rm(binDir, { recursive: true, force: true });
  });

  const cloudflaredPath = path.join(binDir, "cloudflared");
  const pgrepPath = path.join(binDir, "pgrep");
  const tailscalePath = path.join(binDir, "tailscale");
  await writeFile(cloudflaredPath, "#!/bin/sh\necho 'cloudflared version 2026.6.0'\n");
  await writeFile(pgrepPath, `#!/bin/sh
if [ "$2" = "cloudflared" ]; then
  echo '123 cloudflared tunnel --url http://127.0.0.1:4567 https://amber-lifeos.trycloudflare.com'
  exit 0
fi
exit 1
`);
  await writeFile(tailscalePath, `#!/bin/sh
if [ "$1" = "version" ]; then
  echo "1.66.4"
  exit 0
fi
if [ "$1" = "status" ]; then
  echo '{"Self":{"Online":true,"HostName":"lifeos-mac","TailscaleIPs":["100.64.0.10"]},"MagicDNSSuffix":"tailnet.example.ts.net"}'
  exit 0
fi
exit 1
`);
  await chmod(cloudflaredPath, 0o755);
  await chmod(pgrepPath, 0o755);
  await chmod(tailscalePath, 0o755);

  process.env.PATH = `${binDir}:${oldPath}`;
  process.env.LIFEOS_PORT = "4567";
  process.env.LIFEOS_HOST = "127.0.0.1";

  const { getNetworkDiagnostics } = await import(`../server/networkDiagnostics.ts?mock=${Date.now()}`);
  const diagnostics = getNetworkDiagnostics();
  assert.equal(diagnostics.cloudflare.installed, true);
  assert.match(diagnostics.cloudflare.version, /cloudflared version 2026\.6\.0/);
  assert.equal(diagnostics.cloudflare.running, true);
  assert.deepEqual(diagnostics.cloudflare.detectedUrls, ["https://amber-lifeos.trycloudflare.com"]);
  assert.equal(diagnostics.cloudflare.suggestedCommand, "cloudflared tunnel --url http://127.0.0.1:4567");
  assert.match(diagnostics.cloudflare.envTemplate, /PUBLIC_BASE_URL=https:\/\/amber-lifeos\.trycloudflare\.com/);
  assert.equal(diagnostics.tailscale.installed, true);
  assert.equal(diagnostics.tailscale.online, true);
  assert.equal(diagnostics.tailscale.deviceName, "lifeos-mac");
  assert.equal(diagnostics.tailscale.tailnetName, "tailnet.example.ts.net");
  assert.deepEqual(diagnostics.tailscale.urls, ["http://100.64.0.10:4567"]);
  assert.deepEqual(diagnostics.tailscale.magicDnsUrls, ["http://lifeos-mac.tailnet.example.ts.net:4567"]);
  assert.deepEqual(diagnostics.tailscale.mobileUrls, ["http://lifeos-mac.tailnet.example.ts.net:4567", "http://100.64.0.10:4567"]);
  assert.equal(diagnostics.tailscale.envTemplate, "LIFEOS_HOST=0.0.0.0 LIFEOS_ALLOW_PUBLIC=1 PUBLIC_BASE_URL=http://lifeos-mac.tailnet.example.ts.net:4567 npm run start");
  assert.equal(diagnostics.lanEnvTemplate, "LIFEOS_HOST=0.0.0.0 LIFEOS_ALLOW_PUBLIC=1 npm run start");
  assert.equal(diagnostics.recommendedBaseUrl, "https://amber-lifeos.trycloudflare.com");
  assert.equal(diagnostics.connectionCandidates[0].id, "cloudflare-0");
  assert.equal(diagnostics.connectionCandidates[0].mobilePairUrl, "https://amber-lifeos.trycloudflare.com/mobile/pair");
  assert.equal(diagnostics.connectionCandidates[0].secure, true);
  assert.equal(diagnostics.connectionCandidates[0].envTemplate, "LIFEOS_HOST=0.0.0.0 LIFEOS_ALLOW_PUBLIC=1 PUBLIC_BASE_URL=https://amber-lifeos.trycloudflare.com npm run start");
  assert.match(diagnostics.connectionCandidates[0].restartInstruction, /复制启动环境/);
  assert.equal(diagnostics.connectionCandidates.some((candidate) => candidate.id === "tailscale-magicdns-0" && candidate.baseUrl === "http://lifeos-mac.tailnet.example.ts.net:4567"), true);
  assert.equal(diagnostics.connectionCandidates.some((candidate) => candidate.id === "tailscale-ip-0" && candidate.baseUrl === "http://100.64.0.10:4567"), true);
  const tailscaleCandidate = diagnostics.connectionCandidates.find((candidate) => candidate.id === "tailscale-magicdns-0");
  assert.match(tailscaleCandidate.envTemplate, /PUBLIC_BASE_URL=http:\/\/lifeos-mac\.tailnet\.example\.ts\.net:4567/);
});

test("network diagnostics normalizes configured public base URLs before UI and pairing use", async (t) => {
  const oldPublicBaseUrl = process.env.PUBLIC_BASE_URL;
  const oldAppUrl = process.env.APP_URL;
  const oldPath = process.env.PATH || "";
  const binDir = await mkdtemp(path.join(tmpdir(), "lifeos-network-empty-bin-"));

  t.after(async () => {
    if (oldPublicBaseUrl === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = oldPublicBaseUrl;
    if (oldAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = oldAppUrl;
    process.env.PATH = oldPath;
    await rm(binDir, { recursive: true, force: true });
  });

  process.env.PUBLIC_BASE_URL = "https://user:password@example.com/lifeos/?token=pair-secret#debug";
  process.env.APP_URL = "";
  process.env.PATH = binDir;

  const { getNetworkDiagnostics } = await import(`../server/networkDiagnostics.ts?public-url=${Date.now()}`);
  const diagnostics = getNetworkDiagnostics();
  assert.equal(diagnostics.publicBaseUrl, "https://example.com/lifeos");
  assert.equal(diagnostics.recommendedBaseUrl, "https://example.com/lifeos");
  assert.equal(diagnostics.connectionCandidates[0].id, "configured-public");
  assert.equal(diagnostics.connectionCandidates[0].requiresRestart, false);
  assert.equal(JSON.stringify(diagnostics).includes("pair-secret"), false);
  assert.equal(JSON.stringify(diagnostics).includes("user:password"), false);
});

test("connection URL tests strip credentials, query secrets, and fragments from returned probe URL", async (t) => {
  const originalFetch = globalThis.fetch;
  let fetchedUrl = "";
  globalThis.fetch = async (url) => {
    fetchedUrl = String(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ service: "lifeos-local-core", publicAccessWarning: true }),
    };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { testConnectionUrl } = await import(`../server/networkDiagnostics.ts?test-url=${Date.now()}`);
  const result = await testConnectionUrl("https://user:password@example.test/lifeos?token=connection-secret#debug");

  assert.equal(result.ok, true);
  assert.equal(result.url, "https://example.test/api/v1/health");
  assert.equal(fetchedUrl, "https://example.test/api/v1/health");
  assert.equal(JSON.stringify(result).includes("connection-secret"), false);
  assert.equal(JSON.stringify(result).includes("user:password"), false);
  assert.equal(JSON.stringify(result).includes("#debug"), false);
});
