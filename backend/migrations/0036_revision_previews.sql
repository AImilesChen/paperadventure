-- A checkpoint change is prepared privately and only becomes the download
-- version after the purchaser accepts it. Existing revision requests remain
-- readable and published files remain untouched while a preview is pending.
CREATE TABLE IF NOT EXISTS revision_previews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
  mode TEXT NOT NULL DEFAULT 'preset' CHECK (mode IN ('preset','custom')),
  instruction TEXT NOT NULL,
  base_version INTEGER NOT NULL,
  base_story_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','generating','ready','published','discarded','failed')),
  lease_until INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  story_r2_key TEXT,
  story_sha256 TEXT,
  player_r2_key TEXT,
  player_sha256 TEXT,
  guide_r2_key TEXT,
  guide_sha256 TEXT,
  provider_response_id TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  published_version INTEGER,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_revision_preview_per_order
  ON revision_previews(order_id)
  WHERE status IN ('queued','generating','ready');
