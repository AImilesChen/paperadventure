-- Runtime additions. Keep sales disabled until merchant, content and legal release gates pass.
ALTER TABLE orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE orders ADD COLUMN checkout_url TEXT;
ALTER TABLE artifact_versions ADD COLUMN story_r2_key TEXT;
ALTER TABLE artifact_versions ADD COLUMN story_sha256 TEXT;
ALTER TABLE custom_activities ADD COLUMN lease_until INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_idx ON orders(idempotency_key);

CREATE TABLE IF NOT EXISTS ready_pack_files (
  ready_pack_id TEXT NOT NULL REFERENCES ready_packs(id),
  paper TEXT NOT NULL CHECK (paper IN ('A4','Letter')),
  role TEXT NOT NULL CHECK (role IN ('player','guide')),
  r2_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  PRIMARY KEY (ready_pack_id, paper, role)
);

CREATE TABLE IF NOT EXISTS access_challenges (
  nonce_hash TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE TABLE IF NOT EXISTS access_rate_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_usage (
  order_id TEXT NOT NULL REFERENCES orders(id),
  attempt INTEGER NOT NULL,
  response_id TEXT,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id, attempt)
);

CREATE TABLE IF NOT EXISTS adult_drafts (
  email_hash TEXT PRIMARY KEY,
  draft_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proposal_usage (
  id TEXT PRIMARY KEY,
  visitor_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revision_requests (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
  instruction TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','generating','published','failed')),
  lease_until INTEGER,
  version_number INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_revision_per_order ON revision_requests(order_id) WHERE status IN ('queued','generating');

CREATE TABLE IF NOT EXISTS legal_documents (
  kind TEXT NOT NULL CHECK (kind IN ('privacy','terms','cookies','refunds')),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  effective_at TEXT NOT NULL,
  sections_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','published','retired')),
  PRIMARY KEY (kind, version)
);

CREATE TABLE IF NOT EXISTS support_cases (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  email_hash TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('clue','answer','printing','delivery','refund','other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open','reviewing','resolved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS support_cases_order_idx ON support_cases(order_id,created_at);

CREATE TABLE IF NOT EXISTS delivery_notifications (
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('payment','files_ready')),
  status TEXT NOT NULL CHECK (status IN ('pending','sent','blocked')),
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT,
  PRIMARY KEY (order_id,kind)
);
