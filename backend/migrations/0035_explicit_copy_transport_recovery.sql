-- A customer-initiated, bounded continuation after the first printed-copy
-- request produced no persisted response. Migration alone grants nothing.
CREATE TABLE custom_delivery_copy_transport_recoveries (
  order_id TEXT NOT NULL REFERENCES orders(id),
  policy TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  spec_sha256 TEXT NOT NULL,
  repair_calls INTEGER NOT NULL DEFAULT 0 CHECK(repair_calls BETWEEN 0 AND 1),
  audit_calls INTEGER NOT NULL DEFAULT 0 CHECK(audit_calls BETWEEN 0 AND 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(order_id,policy)
);
