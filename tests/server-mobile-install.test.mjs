import assert from "node:assert/strict";
import test from "node:test";
import {
  getInstallPairingToken,
  htmlWithInstallPairingManifest,
  mobileManifest,
  normalizeInstallPairingToken,
  pairingInstallPath,
} from "../server/mobileInstall.ts";

function request(path, query = {}) {
  return { path, query };
}

test("server mobile install helpers normalize and extract pairing tokens", () => {
  assert.equal(normalizeInstallPairingToken(" bind_safe_token_123 "), "bind_safe_token_123");
  assert.equal(normalizeInstallPairingToken("not-secret"), "");
  assert.equal(pairingInstallPath("bind_safe_token_123"), "/mobile/install/bind_safe_token_123");
  assert.equal(getInstallPairingToken(request("/mobile/install/bind_from_path_123")), "bind_from_path_123");
  assert.equal(getInstallPairingToken(request("/mobile/install/bind_encoded_token_123%2Dabc")), "bind_encoded_token_123-abc");
  assert.equal(getInstallPairingToken(request("/mobile/pair", { token: "bind_from_pair_123" })), "bind_from_pair_123");
  assert.equal(getInstallPairingToken(request("/mobile/chat", { pairingToken: "bind_from_chat_123" })), "bind_from_chat_123");
});

test("server mobile install helpers ignore malformed or unsafe pairing tokens", () => {
  assert.equal(normalizeInstallPairingToken("bind_short"), "");
  assert.equal(normalizeInstallPairingToken("bind_<script>alert(1)</script>"), "");
  assert.equal(getInstallPairingToken(request("/mobile/install/%E0%A4%A")), "");
  assert.equal(getInstallPairingToken(request("/mobile/install/bind_unsafe_token_123%2Fextra")), "");
  assert.equal(getInstallPairingToken(request("/mobile/pair", { token: ["bind_array_token_123"] })), "");
});

test("server mobile manifest preserves pairing token for add-to-home-screen", () => {
  const manifest = mobileManifest("bind_manifest_token_123");
  assert.equal(manifest.start_url, "/mobile/install/bind_manifest_token_123");
  assert.equal(manifest.shortcuts.find((shortcut) => shortcut.short_name === "绑定")?.url, "/mobile/install/bind_manifest_token_123");

  const defaultManifest = mobileManifest();
  assert.equal(defaultManifest.start_url, "/mobile/chat");
});

test("server install html injects dynamic manifest href only for valid pairing tokens", () => {
  const html = '<html><head><link rel="manifest" href="/manifest.webmanifest" /></head></html>';
  assert.match(
    htmlWithInstallPairingManifest(html, request("/mobile/install/bind_html_token_123")),
    /href="\/manifest\.webmanifest\?pairingToken=bind_html_token_123"/,
  );
  assert.equal(htmlWithInstallPairingManifest(html, request("/mobile/install/not-secret")), html);
});
