-- A separate, explicitly requested single extra review. The original content
-- ledger's CHECK(calls <= 2), source and original candidate stay unchanged.
-- Deployment creates no grant or provider work.
CREATE TABLE custom_delivery_fact_repairs (
  order_id TEXT NOT NULL REFERENCES orders(id),
  policy TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  spec_sha256 TEXT NOT NULL,
  candidate_sha256 TEXT NOT NULL,
  fact_json TEXT,
  fact_response_json TEXT,
  extra_audit_calls INTEGER NOT NULL DEFAULT 0 CHECK(extra_audit_calls BETWEEN 0 AND 1),
  audit_response_json TEXT,
  audit_candidate_sha256 TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(order_id,policy)
);
