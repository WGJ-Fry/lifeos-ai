CREATE TABLE IF NOT EXISTS device_connectivity_reports (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  ok INTEGER NOT NULL,
  current_base_url TEXT NOT NULL,
  health_ok INTEGER NOT NULL,
  websocket_ok INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  error TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
