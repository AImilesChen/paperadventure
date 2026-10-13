-- New custom orders review a paid plan before any printable files are made.
-- Older creator orders have no row here and keep their original fulfilment path.
CREATE TABLE IF NOT EXISTS custom_plan_orders (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  status TEXT NOT NULL CHECK(status IN ('queued','generating','review','confirmed','needs_help')),
  active_version INTEGER NOT NULL DEFAULT 0,
  confirmed_version INTEGER,
  full_used INTEGER NOT NULL DEFAULT 0 CHECK(full_used BETWEEN 0 AND 2),
  targeted_used INTEGER NOT NULL DEFAULT 0 CHECK(targeted_used BETWEEN 0 AND 3),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS custom_plan_versions (
  order_id TEXT NOT NULL REFERENCES orders(id),
  version_number INTEGER NOT NULL,
  plan_json TEXT NOT NULL,
  request_kind TEXT NOT NULL CHECK(request_kind IN ('initial','full','targeted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(order_id,version_number)
);
CREATE TABLE IF NOT EXISTS custom_plan_requests (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK(kind IN ('initial','full','targeted')),
  scope TEXT,
  feedback TEXT,
  base_version INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('queued','generating','published','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER,
  result_version INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_custom_plan_request
  ON custom_plan_requests(order_id) WHERE status IN ('queued','generating');
