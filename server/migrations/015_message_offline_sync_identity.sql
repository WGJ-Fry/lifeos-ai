ALTER TABLE messages ADD COLUMN offline_mutation_id TEXT;
ALTER TABLE messages ADD COLUMN idempotency_key TEXT;
ALTER TABLE messages ADD COLUMN client_sequence INTEGER;
ALTER TABLE messages ADD COLUMN source_version INTEGER;
ALTER TABLE messages ADD COLUMN queued_at INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_session_idempotency_key
  ON messages (session_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
