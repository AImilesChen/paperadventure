-- Existing approved orders retain the v1 whole-story path. New plan approvals
-- opt into resumable blueprint and checkpoint generation.
ALTER TABLE custom_activities ADD COLUMN generation_version INTEGER NOT NULL DEFAULT 1 CHECK (generation_version IN (1,2));
ALTER TABLE custom_activities ADD COLUMN pipeline_failures INTEGER NOT NULL DEFAULT 0;

CREATE TABLE custom_game_blueprints (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  spec_sha256 TEXT NOT NULL,
  blueprint_sha256 TEXT NOT NULL,
  blueprint_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE custom_game_stages (
  order_id TEXT NOT NULL REFERENCES orders(id),
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
  blueprint_sha256 TEXT NOT NULL,
  stage_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id,stage_number)
);

CREATE TABLE custom_generation_calls (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  phase TEXT NOT NULL CHECK (phase IN ('blueprint','checkpoint','audit')),
  stage_number INTEGER NOT NULL DEFAULT 0 CHECK (stage_number BETWEEN 0 AND 5),
  status TEXT NOT NULL CHECK (status IN ('started','passed','failed')),
  model TEXT NOT NULL,
  response_id TEXT,
  result_json TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  error_code TEXT,
  error_detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE INDEX custom_generation_calls_order_step ON custom_generation_calls(order_id,phase,stage_number,id);

-- A successful whole-game audit is tied to the exact assembled story. If the
-- database or queue fails after QA, resume without buying another audit.
CREATE TABLE custom_game_audits (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  story_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
