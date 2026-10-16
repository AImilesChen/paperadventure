-- Internal only: never return checkpoint_json through the order API or logs.
-- This migration neither queues work nor grants additional generation attempts.
CREATE TABLE IF NOT EXISTS custom_plan_work (
  request_id TEXT PRIMARY KEY REFERENCES custom_plan_requests(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  context_sha256 TEXT NOT NULL,
  checkpoint_json TEXT,
  phase TEXT NOT NULL DEFAULT 'queued',
  candidate_saved INTEGER NOT NULL DEFAULT 0,
  plan_valid INTEGER NOT NULL DEFAULT 0,
  audit_passed INTEGER NOT NULL DEFAULT 0,
  provider_calls INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
