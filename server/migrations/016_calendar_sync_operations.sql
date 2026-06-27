CREATE TABLE IF NOT EXISTS calendar_sync_operations (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  external_id TEXT,
  status TEXT NOT NULL,
  connector TEXT NOT NULL,
  source TEXT,
  rollback_plan_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  rolled_back_at INTEGER,
  rollback_result_json TEXT,
  rollback_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_operations_created_at
  ON calendar_sync_operations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_operations_provider_external
  ON calendar_sync_operations (provider_id, kind, external_id);
