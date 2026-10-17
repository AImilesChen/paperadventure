-- Save a checked story before rendering PDFs so delivery retries never buy it again.
-- A checkpoint is private and is bound to the exact approved story specification.
CREATE TABLE IF NOT EXISTS custom_story_checkpoints (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  spec_sha256 TEXT NOT NULL,
  story_json TEXT NOT NULL,
  response_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE generation_usage ADD COLUMN error_detail TEXT;

-- Terminal paid failures must reach an operator even if the buyer never opens
-- the support form. This private queue is retried by the scheduled worker.
CREATE TABLE IF NOT EXISTS custom_delivery_incidents (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  phase TEXT NOT NULL,
  error_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  alert_status TEXT NOT NULL DEFAULT 'pending' CHECK (alert_status IN ('pending','sent')),
  alert_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  alerted_at TEXT
);
