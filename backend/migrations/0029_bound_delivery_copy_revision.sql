-- One operator-prepared text-only revision can be reviewed independently.
-- The previous candidate, audit, and three-call ledger stay immutable. Merely
-- applying this migration grants no revision and starts no provider request.
CREATE TABLE custom_delivery_copy_revisions (
  order_id TEXT NOT NULL REFERENCES orders(id),
  policy TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  spec_sha256 TEXT NOT NULL,
  base_sha256 TEXT NOT NULL,
  copy_json TEXT NOT NULL,
  copy_sha256 TEXT NOT NULL,
  audit_calls INTEGER NOT NULL DEFAULT 0 CHECK(audit_calls BETWEEN 0 AND 1),
  audit_candidate_sha256 TEXT,
  audit_response_json TEXT,
  audit_json TEXT,
  audit_passed INTEGER NOT NULL DEFAULT 0 CHECK(audit_passed IN (0,1)),
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(order_id,policy)
);
