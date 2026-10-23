-- Only new purchases opt in. Private baselines are bound to the approved spec;
-- no existing order is queued or rewritten by this migration.
CREATE TABLE custom_generation_baselines (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  spec_sha256 TEXT NOT NULL,
  pack_json TEXT NOT NULL,
  delivery_mode TEXT NOT NULL DEFAULT 'enhanced' CHECK (delivery_mode IN ('enhanced','baseline')),
  error_code TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
