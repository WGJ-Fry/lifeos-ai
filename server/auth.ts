import crypto from "crypto";
import type express from "express";
import { db } from "./db";
import { insertAuditLog } from "./audit";
import { getActiveDeviceById, getActiveDeviceByToken } from "./devices";
import { getCookie } from "./httpSecurity";
import { createSecret, hashPassword, tokenHash, verifyPassword } from "./security";

export type RequestActor = { type: "admin" | "device"; id: string };

export function getDbAdminCredential() {
  return db.prepare("SELECT * FROM admin_credentials WHERE id = 'owner'").get() as any;
}

export function isAdminConfigured() {
  return Boolean(process.env.LIFEOS_ADMIN_PASSWORD || getDbAdminCredential());
}

export function createAdminCredential(password: string, options: { auditAction?: string | false } = {}) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO admin_credentials (id, password_hash, created_at, updated_at)
    VALUES ('owner', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, updated_at = excluded.updated_at
  `).run(hashPassword(password), now, now);
  if (options.auditAction !== false) insertAuditLog(options.auditAction || "admin_configured", "admin", "owner");
}

export function verifyAdminPassword(password: string) {
  if (process.env.LIFEOS_ADMIN_PASSWORD) {
    const actual = Buffer.from(password);
    const expected = Buffer.from(process.env.LIFEOS_ADMIN_PASSWORD);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }
  const credential = getDbAdminCredential();
  return credential ? verifyPassword(password, credential.password_hash) : false;
}

export function createAdminSession() {
  const now = Date.now();
  const token = createSecret("admin");
  const session = {
    id: crypto.randomUUID(),
    token,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
  };
  db.prepare(`
    INSERT INTO admin_sessions (id, token_hash, created_at, expires_at, last_seen_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, NULL)
  `).run(session.id, tokenHash(token), now, session.expiresAt, now);
  insertAuditLog("admin_login", "admin", "owner", { sessionId: session.id });
  return session;
}

export function getBearerToken(req: express.Request) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
  return getCookie(req, "lifeos_admin_session");
}

export function getAdminSessionByToken(token: string | null) {
  if (!token) return undefined;
  const now = Date.now();
  const row = db.prepare(`
    SELECT * FROM admin_sessions
    WHERE token_hash = ? AND expires_at > ? AND revoked_at IS NULL
  `).get(tokenHash(token), now) as any;
  if (!row) return undefined;
  db.prepare("UPDATE admin_sessions SET last_seen_at = ? WHERE id = ?").run(now, row.id);
  return row;
}

export function getDeviceFromRequest(req: express.Request) {
  const deviceId = String(req.headers["x-lifeos-device-id"] || "");
  const accessToken = String(req.headers["x-lifeos-device-token"] || "");
  const tokenDevice = getActiveDeviceByToken(deviceId, accessToken);
  if (tokenDevice) return tokenDevice;

  return getActiveDeviceBySignature({
    deviceId,
    method: req.method,
    path: req.path,
    body: req.body,
    timestamp: String(req.headers["x-lifeos-device-timestamp"] || ""),
    nonce: String(req.headers["x-lifeos-device-nonce"] || ""),
    signature: String(req.headers["x-lifeos-device-signature"] || ""),
  });
}

function base64UrlToBuffer(value: string) {
  return Buffer.from(value, "base64url");
}

function publicKeyToPem(publicKey: string) {
  const base64 = Buffer.from(publicKey, "base64url").toString("base64");
  const wrapped = base64.match(/.{1,64}/g)?.join("\n") || base64;
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
}

function bodyHash(body: unknown) {
  if (body === undefined || body === null || (typeof body === "object" && Object.keys(body as Record<string, unknown>).length === 0)) {
    return crypto.createHash("sha256").update("").digest("base64url");
  }
  return crypto.createHash("sha256").update(JSON.stringify(body)).digest("base64url");
}

export function buildDeviceSignaturePayload(input: { method: string; path: string; bodyHash: string; timestamp: string; nonce: string }) {
  return [input.method.toUpperCase(), input.path, input.bodyHash, input.timestamp, input.nonce].join("\n");
}

export function getActiveDeviceBySignature(input: {
  deviceId: string;
  method: string;
  path: string;
  body?: unknown;
  bodyHash?: string;
  timestamp: string;
  nonce: string;
  signature: string;
}) {
  if (!input.deviceId || !input.timestamp || !input.nonce || !input.signature) return undefined;

  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return undefined;

  const device = getActiveDeviceById(input.deviceId);
  if (!device?.publicKey) return undefined;

  const payload = buildDeviceSignaturePayload({
    method: input.method,
    path: input.path,
    bodyHash: input.bodyHash || bodyHash(input.body),
    timestamp: input.timestamp,
    nonce: input.nonce,
  });

  try {
    const valid = crypto.verify(
      "sha256",
      Buffer.from(payload),
      { key: publicKeyToPem(device.publicKey), dsaEncoding: "ieee-p1363" },
      base64UrlToBuffer(input.signature),
    );
    return valid ? device : undefined;
  } catch {
    return undefined;
  }
}

export function getRequestActor(req: express.Request): RequestActor | null {
  const adminSession = getAdminSessionByToken(getBearerToken(req));
  if (adminSession) return { type: "admin", id: "owner" };

  const device = getDeviceFromRequest(req);
  if (device) return { type: "device", id: device.id };

  return null;
}

export function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminSession = getAdminSessionByToken(getBearerToken(req));
  if (!adminSession) return res.status(401).json({ error: "Admin authentication required" });
  (req as any).actor = { type: "admin", id: "owner" };
  next();
}

export function requireActor(req: express.Request, res: express.Response, next: express.NextFunction) {
  const actor = getRequestActor(req);
  if (!actor) return res.status(401).json({ error: "Authentication required" });
  (req as any).actor = actor;
  next();
}
