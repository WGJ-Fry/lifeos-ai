import crypto from "crypto";
import { db } from "./db";

export type MemoryRecord = {
  id: string;
  title: string;
  content: string;
  sensitivity: "normal" | "sensitive";
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
};

function mapMemory(row: any): MemoryRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    sensitivity: row.sensitivity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
  };
}

export function getMemories(includeDeleted = false) {
  const rows = includeDeleted
    ? db.prepare("SELECT * FROM memories ORDER BY updated_at DESC").all()
    : db.prepare("SELECT * FROM memories WHERE deleted_at IS NULL ORDER BY updated_at DESC").all();
  return rows.map(mapMemory);
}

export function getMemory(memoryId: string) {
  const row = db.prepare("SELECT * FROM memories WHERE id = ?").get(memoryId);
  return row ? mapMemory(row) : undefined;
}

export function insertMemory(title: string, content: string, sensitivity: "normal" | "sensitive" = "normal") {
  const now = Date.now();
  const memory: MemoryRecord = {
    id: crypto.randomUUID(),
    title: title.trim().slice(0, 120),
    content: content.trim(),
    sensitivity,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(`
    INSERT INTO memories (id, title, content, sensitivity, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `).run(memory.id, memory.title, memory.content, memory.sensitivity, memory.createdAt, memory.updatedAt);
  return memory;
}

export function updateMemory(memoryId: string, patch: Partial<Pick<MemoryRecord, "title" | "content" | "sensitivity">>) {
  const existing = getMemory(memoryId);
  if (!existing || existing.deletedAt) return undefined;

  const next = {
    title: patch.title?.trim().slice(0, 120) || existing.title,
    content: patch.content?.trim() || existing.content,
    sensitivity: patch.sensitivity === "sensitive" ? "sensitive" : existing.sensitivity,
    updatedAt: Date.now(),
  };

  db.prepare("UPDATE memories SET title = ?, content = ?, sensitivity = ?, updated_at = ? WHERE id = ?")
    .run(next.title, next.content, next.sensitivity, next.updatedAt, memoryId);
  return getMemory(memoryId);
}

export function softDeleteMemory(memoryId: string) {
  const deletedAt = Date.now();
  db.prepare("UPDATE memories SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
    .run(deletedAt, deletedAt, memoryId);
  return getMemory(memoryId);
}
