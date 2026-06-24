CREATE TABLE IF NOT EXISTS custom_app_capability_requests (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  requested_capabilities_json TEXT NOT NULL,
  missing_capabilities_json TEXT NOT NULL DEFAULT '[]',
  label TEXT NOT NULL,
  reason TEXT,
  risk TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by_type TEXT,
  created_by_id TEXT,
  created_at INTEGER NOT NULL,
  decided_by_type TEXT,
  decided_by_id TEXT,
  decided_at INTEGER,
  decision_note TEXT,
  FOREIGN KEY (app_id) REFERENCES custom_apps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_app_capability_requests_app_status
  ON custom_app_capability_requests (app_id, status, created_at DESC);
