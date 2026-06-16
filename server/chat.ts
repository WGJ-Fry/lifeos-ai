import crypto from "crypto";
import { db } from "./db";

export function createChatSession(title?: string) {
  const now = Date.now();
  const session = {
    id: crypto.randomUUID(),
    title: title?.trim()?.slice(0, 120) || "New Chat",
    createdAt: now,
    updatedAt: now,
  };

  db.prepare("INSERT INTO chat_sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .run(session.id, session.title, session.createdAt, session.updatedAt);
  return session;
}

export function getChatSessions() {
  return db.prepare(`
    SELECT id, title, created_at as createdAt, updated_at as updatedAt
    FROM chat_sessions
    ORDER BY updated_at DESC
  `).all();
}

export function getChatSession(sessionId: string) {
  return db.prepare(`
    SELECT id, title, created_at as createdAt, updated_at as updatedAt
    FROM chat_sessions
    WHERE id = ?
  `).get(sessionId);
}

export function insertMessage(sessionId: string, role: string, contentJson: unknown, sourceDeviceId?: string) {
  const now = Date.now();
  const message = {
    id: crypto.randomUUID(),
    sessionId,
    role,
    contentJson,
    sourceDeviceId,
    createdAt: now,
  };

  db.prepare(`
    INSERT INTO messages (id, session_id, role, content_json, source_device_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(message.id, sessionId, role, JSON.stringify(contentJson), sourceDeviceId || null, now);
  db.prepare("UPDATE chat_sessions SET updated_at = ? WHERE id = ?").run(now, sessionId);
  return message;
}

export function getMessages(sessionId: string) {
  return db.prepare(`
    SELECT id, session_id as sessionId, role, content_json as contentJson, source_device_id as sourceDeviceId, created_at as createdAt
    FROM messages
    WHERE session_id = ?
    ORDER BY created_at ASC
  `).all(sessionId).map((row: any) => ({
    ...row,
    contentJson: JSON.parse(row.contentJson),
  }));
}
