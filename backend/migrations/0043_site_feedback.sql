CREATE TABLE site_feedback (
  id TEXT PRIMARY KEY,
  payload_sha256 TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('suggestion','bug','other')),
  message TEXT NOT NULL CHECK(length(trim(message)) BETWEEN 1 AND 2000),
  reply_email TEXT,
  page_path TEXT NOT NULL,
  browser_category TEXT NOT NULL,
  device_category TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notification_status TEXT NOT NULL DEFAULT 'pending' CHECK(notification_status IN ('pending','sent','attention')),
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  notification_lease_token TEXT,
  notification_lease_until INTEGER NOT NULL DEFAULT 0,
  notification_next_at INTEGER NOT NULL DEFAULT 0,
  notified_at TEXT,
  notification_error_code TEXT
);
CREATE INDEX site_feedback_created ON site_feedback(created_at);
CREATE INDEX site_feedback_pending ON site_feedback(notification_status,notification_next_at);
CREATE TABLE feedback_rate_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
