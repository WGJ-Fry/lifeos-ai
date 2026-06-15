import crypto from "crypto";
import type express from "express";
import { insertAuditLog } from "../audit";
import { requireAdmin } from "../auth";
import { getRequestActor } from "../auth";
import { BindingSession, DeviceRecord, confirmBindingSession, getBindingSessionById, getDevice, getDevices, getOpenBindingSessionByToken, insertBindingSession, insertDevice, pruneExpiredBindingSessions, revokeDeviceRecord, rotateDeviceToken } from "../devices";
import { rateLimit } from "../httpSecurity";
import { getConfiguredPublicBaseUrl, normalizePublicBaseUrl } from "../publicBaseUrl";
import { broadcastRealtime, closeDeviceConnection, isDeviceOnline, sendRealtimeToDevice } from "../realtime";
import { createSecret, tokenHash } from "../security";

function publicBaseUrl(req: express.Request) {
  return getConfiguredPublicBaseUrl() || `${req.protocol}://${req.get("host")}`;
}

function normalizePairingBaseUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length > 240) throw new Error("baseUrl is too long");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("baseUrl is invalid");
  }
  if (parsed.username || parsed.password) throw new Error("baseUrl must not contain credentials");
  const normalized = normalizePublicBaseUrl(raw);
  if (!normalized) throw new Error("Only HTTP/HTTPS baseUrl is allowed");
  return new URL(normalized).origin;
}

function sanitizeDevice(device: DeviceRecord) {
  const { accessTokenHash, ...safeDevice } = device;
  return safeDevice;
}

function deviceTokenExpiresAt(now = Date.now()) {
  return now + Number(process.env.LIFEOS_DEVICE_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000;
}

function pairingInstallUrl(baseUrl: string, token: string) {
  return `${baseUrl}/mobile/install/${encodeURIComponent(token)}`;
}

function revokeDevice(device: DeviceRecord, actor: { type: string; id: string }, reason: "admin" | "self") {
  const revokedAt = Date.now();
  const wasOnline = isDeviceOnline(device.id);
  revokeDeviceRecord(device.id, revokedAt);
  closeDeviceConnection(device.id, "Device revoked");
  insertAuditLog(reason === "self" ? "device_self_revoked" : "device_revoked", "device", device.id, {
    deviceName: device.name,
    deviceType: device.type,
    authMethod: device.publicKey ? "signature" : "token",
    publicKeyConfigured: Boolean(device.publicKey),
    credentialExpiresAt: device.accessTokenExpiresAt || null,
    lastSeenAt: device.lastSeenAt,
    wasOnline,
    revokedAt,
  }, actor.type, actor.id);

  broadcastRealtime({
    type: "device.revoked",
    deviceId: device.id,
    timestamp: Date.now(),
  });
}

export function registerDeviceRoutes(app: express.Express) {
  app.post("/api/v1/devices/bind/start", rateLimit({ keyPrefix: "bind-start", windowMs: 5 * 60 * 1000, max: 20 }), requireAdmin, (req, res) => {
    const now = Date.now();
    const token = createSecret("bind");
    let baseUrl = publicBaseUrl(req);
    try {
      baseUrl = normalizePairingBaseUrl(req.body?.baseUrl) || baseUrl;
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Invalid baseUrl" });
    }
    const session: BindingSession = {
      id: crypto.randomUUID(),
      tokenHash: tokenHash(token),
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000,
    };

    pruneExpiredBindingSessions(now);
    insertBindingSession(session);
    insertAuditLog("binding_session_created", "binding_session", session.id, {
      baseUrl,
      expiresAt: session.expiresAt,
    }, (req as any).actor?.type, (req as any).actor?.id);

    res.json({
      id: session.id,
      token,
      expiresAt: session.expiresAt,
      baseUrl,
      pairingUrl: pairingInstallUrl(baseUrl, token),
      localName: process.env.LIFEOS_DEVICE_NAME || "LifeOS Local Core",
    });
  });

  app.get("/api/v1/devices/bind/:bindingId", requireAdmin, (req, res) => {
    const session = getBindingSessionById(req.params.bindingId);
    if (!session) return res.status(404).json({ error: "Binding session not found" });

    const device = session.confirmedDeviceId ? getDevice(session.confirmedDeviceId) : undefined;

    res.json({
      id: session.id,
      expiresAt: session.expiresAt,
      confirmedAt: session.confirmedAt,
      device: device ? sanitizeDevice(device) : null,
    });
  });

  app.post("/api/v1/devices/bind/confirm", rateLimit({ keyPrefix: "bind-confirm", windowMs: 5 * 60 * 1000, max: 20 }), (req, res) => {
    const { token, deviceName, deviceType, publicKey } = req.body || {};
    if (!token || !deviceName) {
      return res.status(400).json({ error: "token and deviceName are required" });
    }

    const now = Date.now();
    const session = getOpenBindingSessionByToken(token, now);
    if (!session) {
      return res.status(400).json({ error: "Binding token is invalid or expired" });
    }

    const accessToken = createSecret("device");
    const device: DeviceRecord = {
      id: crypto.randomUUID(),
      name: String(deviceName).slice(0, 80),
      type: deviceType === "desktop" || deviceType === "browser" ? deviceType : "mobile",
      status: "offline",
      publicKey: typeof publicKey === "string" ? publicKey : undefined,
      accessTokenHash: tokenHash(accessToken),
      accessTokenExpiresAt: deviceTokenExpiresAt(now),
      createdAt: now,
      lastSeenAt: now,
    };

    const authMethod = device.publicKey ? "signature" : "token";
    insertDevice(device);
    confirmBindingSession(session.id, device.id, now);
    insertAuditLog("device_bound", "device", device.id, {
      bindingSessionId: session.id,
      name: device.name,
      type: device.type,
      authMethod,
      credentialExpiresAt: device.accessTokenExpiresAt,
    }, "device", device.id);

    broadcastRealtime({
      type: "pairing.confirmed",
      pairingId: session.id,
      device: sanitizeDevice(device),
      timestamp: now,
    });

    res.json({
      device: sanitizeDevice(device),
      accessToken,
      accessTokenExpiresAt: device.accessTokenExpiresAt,
    });
  });

  app.post("/api/v1/devices/token/rotate", (req, res) => {
    const actor = getRequestActor(req);
    if (!actor || actor.type !== "device") return res.status(401).json({ error: "Device authentication required" });

    const previousDevice = getDevice(actor.id);
    const accessToken = createSecret("device");
    const accessTokenExpiresAt = deviceTokenExpiresAt();
    const device = rotateDeviceToken(actor.id, tokenHash(accessToken), accessTokenExpiresAt);
    if (!device) return res.status(404).json({ error: "Device not found" });

    insertAuditLog("device_token_rotated", "device", actor.id, {
      deviceName: device.name,
      deviceType: device.type,
      authMethod: device.publicKey ? "signature" : "token",
      previousCredentialExpiresAt: previousDevice?.accessTokenExpiresAt || null,
      credentialExpiresAt: accessTokenExpiresAt,
      rotatedAt: Date.now(),
    }, "device", actor.id);
    res.json({ device: sanitizeDevice(device), accessToken, accessTokenExpiresAt });
  });

  app.delete("/api/v1/devices/me", (req, res) => {
    const actor = getRequestActor(req);
    if (!actor || actor.type !== "device") return res.status(401).json({ error: "Device authentication required" });
    const device = getDevice(actor.id);
    if (!device || device.revokedAt) return res.status(404).json({ error: "Device not found" });

    revokeDevice(device, actor, "self");
    res.json({ ok: true, device: sanitizeDevice({ ...device, status: "revoked", revokedAt: Date.now() }) });
  });

  app.get("/api/v1/devices", requireAdmin, (_req, res) => {
    res.json({
      devices: getDevices().map((device) => ({
        ...sanitizeDevice(device),
        status: isDeviceOnline(device.id) ? "online" : device.status,
      })),
    });
  });

  app.post("/api/v1/devices/:deviceId/token/rotation-request", requireAdmin, (req, res) => {
    const device = getDevice(req.params.deviceId);
    if (!device || device.revokedAt) return res.status(404).json({ error: "Device not found" });

    const requestedAt = Date.now();
    const delivered = sendRealtimeToDevice(device.id, {
      type: "device.token.rotate_requested",
      deviceId: device.id,
      requestedAt,
      timestamp: requestedAt,
    });

    insertAuditLog("device_token_rotation_requested", "device", device.id, {
      delivered,
      deviceName: device.name,
      deviceType: device.type,
      requestedAt,
    }, (req as any).actor?.type, (req as any).actor?.id);
    res.json({ ok: true, delivered });
  });

  app.delete("/api/v1/devices/:deviceId", requireAdmin, (req, res) => {
    const device = getDevice(req.params.deviceId);
    if (!device) return res.status(404).json({ error: "Device not found" });

    revokeDevice(device, (req as any).actor, "admin");
    res.json({ ok: true });
  });
}
