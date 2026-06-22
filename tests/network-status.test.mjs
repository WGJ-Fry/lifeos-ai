// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

test("network status classifies offline and weak connections", async () => {
  const { getNetworkStatus } = await import("../src/services/networkStatus.ts");

  assert.equal(getNetworkStatus({ onLine: false }).quality, "offline");
  assert.equal(getNetworkStatus({ onLine: false }).labelKey, "network.offline");
  assert.equal(getNetworkStatus({ onLine: true, connection: { effectiveType: "2g" } }).quality, "poor");
  assert.equal(getNetworkStatus({ onLine: true, connection: { effectiveType: "2g" } }).labelKey, "network.weak");
  assert.equal(getNetworkStatus({ onLine: true, connection: { downlink: 0.3 } }).quality, "poor");
  assert.equal(getNetworkStatus({ onLine: true, connection: { rtt: 1200 } }).quality, "poor");
  assert.equal(getNetworkStatus({ onLine: true, connection: { saveData: true } }).quality, "poor");
  assert.equal(getNetworkStatus({ onLine: true, connection: { effectiveType: "4g", downlink: 20, rtt: 50 } }).quality, "ok");
  assert.equal(getNetworkStatus({ onLine: true, connection: { effectiveType: "4g", downlink: 20, rtt: 50 } }).labelKey, "network.available");
  assert.equal(getNetworkStatus({ onLine: true }).quality, "unknown");
  assert.equal(getNetworkStatus({ onLine: true }).labelKey, "network.unknown");
});
