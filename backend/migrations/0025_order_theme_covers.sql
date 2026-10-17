-- Covers are independent of plans/PDFs. No existing order is backfilled here.
CREATE TABLE IF NOT EXISTS order_theme_covers (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','submitting','pending','ready','failed')),
  model TEXT NOT NULL DEFAULT 'fal-ai/flux/schnell',
  generation_calls INTEGER NOT NULL DEFAULT 0 CHECK(generation_calls BETWEEN 0 AND 1),
  request_id TEXT,
  status_url TEXT,
  response_url TEXT,
  prompt TEXT,
  poll_count INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  next_check_at INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  r2_key TEXT,
  sha256 TEXT,
  bytes INTEGER,
  content_type TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS order_theme_cover_pending ON order_theme_covers(status,next_check_at,lease_until);

