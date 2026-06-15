import crypto from "crypto";
import { db } from "./db";

const sensitiveMetadataKey = /api[-_]?key|token|password|passphrase|secret|authorization|cookie|hash|ciphertext|auth[-_]?tag|private|path/i;

function redactUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      parsed.username = "";
      parsed.password = "";
      parsed.search = parsed.search ? "?[redacted]" : "";
      parsed.hash = parsed.hash ? "#[redacted]" : "";
      return parsed.toString();
    }
  } catch {}
  return value;
}

function redactAuditString(value: string) {
  const redacted = value
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, "Bearer [redacted]")
    .replace(/\bAIzaSy[A-Za-z0-9_-]{20,}\b/g, "[redacted]")
    .replace(/\bsk-(?:or-)?[A-Za-z0-9_-]{16,}\b/g, "[redacted]")
    .replace(/\b(?:bind|device)_[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\/Users\/[^\s,;"]+/g, "[local-path]")
    .replace(/[A-Za-z]:\\[^\s,;"]+/g, "[local-path]")
    .replace(/https?:\/\/[^\s,;"'<>]+/gi, (match) => redactUrl(match));

  return redactUrl(redacted);
}

export function redactAuditMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuditMetadata);
  if (typeof value === "string") return redactAuditString(value);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (sensitiveMetadataKey.test(key) && typeof item !== "boolean" && typeof item !== "number") return [key, "[redacted]"];
    return [key, redactAuditMetadata(item)];
  }));
}

export function insertAuditLog(action: string, targetType?: string, targetId?: string, metadata?: unknown, actorType = "system", actorId?: string) {
  const redactedTargetId = targetId ? redactAuditString(targetId) : null;
  const redactedMetadata = metadata ? redactAuditMetadata(metadata) : null;
  db.prepare(`
    INSERT INTO audit_logs (id, actor_type, actor_id, action, target_type, target_id, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    actorType,
    actorId || null,
    action,
    targetType || null,
    redactedTargetId,
    redactedMetadata ? JSON.stringify(redactedMetadata) : null,
    Date.now(),
  );
}

export function listAuditLogs(limit = 100) {
  return db.prepare(`
    SELECT id, actor_type as actorType, actor_id as actorId, action, target_type as targetType, target_id as targetId,
           metadata_json as metadataJson, created_at as createdAt
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit).map((row: any) => ({
    ...row,
    targetId: row.targetId ? redactAuditString(row.targetId) : row.targetId,
    metadataJson: row.metadataJson ? redactAuditMetadata(JSON.parse(row.metadataJson)) : null,
  })).map((row: any) => ({
    ...row,
    metadata: row.metadataJson,
  }));
}
