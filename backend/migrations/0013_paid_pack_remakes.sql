-- An old paid pack can be rebuilt in the current paper-material format on its
-- original order. The published artifact remains available until the remake
-- passes story, PDF and storage checks and a newer artifact is committed.
ALTER TABLE artifact_versions ADD COLUMN pack_format_version INTEGER NOT NULL DEFAULT 1 CHECK (pack_format_version IN (1,2));

CREATE TABLE custom_pack_remakes (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  status TEXT NOT NULL CHECK (status IN ('queued','generating','failed','ready')),
  phase TEXT NOT NULL DEFAULT 'blueprint',
  spec_json TEXT NOT NULL,
  spec_sha256 TEXT NOT NULL,
  blueprint_json TEXT,
  blueprint_sha256 TEXT,
  stages_json TEXT NOT NULL DEFAULT '[]',
  story_json TEXT,
  story_sha256 TEXT,
  published_version INTEGER,
  error_code TEXT,
  error_detail TEXT,
  lease_until INTEGER,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TABLE custom_pack_remake_calls (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES custom_pack_remakes(order_id),
  phase TEXT NOT NULL CHECK (phase IN ('blueprint','checkpoint','audit')),
  stage_number INTEGER NOT NULL DEFAULT 0 CHECK (stage_number BETWEEN 0 AND 5),
  status TEXT NOT NULL CHECK (status IN ('started','passed','failed')),
  model TEXT NOT NULL,
  result_json TEXT,
  response_id TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  error_code TEXT,
  error_detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE INDEX custom_pack_remake_calls_step ON custom_pack_remake_calls(order_id,phase,stage_number,created_at);
