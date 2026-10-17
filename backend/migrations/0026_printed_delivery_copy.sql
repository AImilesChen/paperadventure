-- A fixed two-call lifetime budget for one printed-content edition. Queue
-- redeliveries and retry rounds cannot reset it or replace the bound source.
CREATE TABLE custom_delivery_copy (
  order_id TEXT NOT NULL REFERENCES orders(id),
  policy TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  spec_sha256 TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0 CHECK (calls BETWEEN 0 AND 2),
  candidate_json TEXT,
  audit_json TEXT,
  audit_passed INTEGER NOT NULL DEFAULT 0,
  response_id TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_detail TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id,policy)
);
