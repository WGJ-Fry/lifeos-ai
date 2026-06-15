import { db } from "./db";
import { tokenHash } from "./security";

export type DeviceRecord = {
  id: string;
  name: string;
  type: "mobile" | "desktop" | "browser";
  status: "online" | "offline" | "revoked";
  publicKey?: string;
  accessTokenHash: string;
  accessTokenExpiresAt?: number;
  createdAt: number;
  lastSeenAt: number;
  revokedAt?: number;
};

export type BindingSession = {
  id: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
  confirmedAt?: number;
  confirmedDeviceId?: string;
};

function mapDevice(row: any): DeviceRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    publicKey: row.public_key || undefined,
    accessTokenHash: row.access_token_hash,
    accessTokenExpiresAt: row.access_token_expires_at || undefined,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at || undefined,
  };
}

function mapBindingSession(row: any): BindingSession {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    confirmedAt: row.confirmed_at || undefined,
    confirmedDeviceId: row.confirmed_device_id || undefined,
  };
}

export function getDevices(includeRevoked = false) {
  const rows = includeRevoked
    ? db.prepare("SELECT * FROM devices ORDER BY created_at DESC").all()
    : db.prepare("SELECT * FROM devices WHERE revoked_at IS NULL ORDER BY created_at DESC").all();
  return rows.map(mapDevice);
}

export function getDevice(deviceId: string) {
  const row = db.prepare("SELECT * FROM devices WHERE id = ?").get(deviceId);
  return row ? mapDevice(row) : undefined;
}

export function getActiveDeviceByToken(deviceId: string | null, accessToken: string | null) {
  if (!deviceId || !accessToken) return undefined;
  const now = Date.now();
  const row = db
    .prepare("SELECT * FROM devices WHERE id = ? AND access_token_hash = ? AND revoked_at IS NULL AND (access_token_expires_at IS NULL OR access_token_expires_at > ?)")
    .get(deviceId, tokenHash(accessToken), now);
  return row ? mapDevice(row) : undefined;
}

export function getActiveDeviceById(deviceId: string | null) {
  if (!deviceId) return undefined;
  const row = db.prepare("SELECT * FROM devices WHERE id = ? AND revoked_at IS NULL").get(deviceId);
  return row ? mapDevice(row) : undefined;
}

export function insertDevice(device: DeviceRecord) {
  db.prepare(`
    INSERT INTO devices (id, name, type, status, public_key, access_token_hash, access_token_expires_at, created_at, last_seen_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    device.id,
    device.name,
    device.type,
    device.status,
    device.publicKey || null,
    device.accessTokenHash,
    device.accessTokenExpiresAt || null,
    device.createdAt,
    device.lastSeenAt,
    device.revokedAt || null,
  );
}

export function rotateDeviceToken(deviceId: string, accessTokenHash: string, accessTokenExpiresAt: number) {
  db.prepare("UPDATE devices SET access_token_hash = ?, access_token_expires_at = ?, last_seen_at = ? WHERE id = ? AND revoked_at IS NULL").run(
    accessTokenHash,
    accessTokenExpiresAt,
    Date.now(),
    deviceId,
  );
  return getDevice(deviceId);
}

export function updateDevicePresence(deviceId: string, status: "online" | "offline", lastSeenAt: number) {
  db.prepare("UPDATE devices SET status = ?, last_seen_at = ? WHERE id = ? AND revoked_at IS NULL").run(status, lastSeenAt, deviceId);
}

export function revokeDeviceRecord(deviceId: string, revokedAt: number) {
  db.prepare("UPDATE devices SET status = 'revoked', revoked_at = ? WHERE id = ?").run(revokedAt, deviceId);
}

export function insertBindingSession(session: BindingSession) {
  db.prepare(`
    INSERT INTO binding_sessions (id, token_hash, created_at, expires_at, confirmed_at, confirmed_device_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.tokenHash,
    session.createdAt,
    session.expiresAt,
    session.confirmedAt || null,
    session.confirmedDeviceId || null,
  );
}

export function getBindingSessionById(bindingId: string) {
  const row = db.prepare("SELECT * FROM binding_sessions WHERE id = ?").get(bindingId);
  return row ? mapBindingSession(row) : undefined;
}

export function getOpenBindingSessionByToken(token: string, now: number) {
  const row = db
    .prepare("SELECT * FROM binding_sessions WHERE token_hash = ? AND expires_at > ? AND confirmed_at IS NULL")
    .get(tokenHash(token), now);
  return row ? mapBindingSession(row) : undefined;
}

export function confirmBindingSession(bindingId: string, deviceId: string, confirmedAt: number) {
  db.prepare("UPDATE binding_sessions SET confirmed_at = ?, confirmed_device_id = ? WHERE id = ?").run(confirmedAt, deviceId, bindingId);
}

export function pruneExpiredBindingSessions(now: number) {
  db.prepare("DELETE FROM binding_sessions WHERE expires_at <= ? AND confirmed_at IS NULL").run(now);
}
