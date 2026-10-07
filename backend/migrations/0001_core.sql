-- Proposed D1 schema. Apply only after the merchant, retention, auth and licence decisions are approved.
CREATE TABLE IF NOT EXISTS theme_worlds (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','published','paused','retired')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ready_packs (
  id TEXT PRIMARY KEY,
  theme_world_id TEXT NOT NULL REFERENCES theme_worlds(id),
  setting TEXT NOT NULL CHECK (setting IN ('home','classroom')),
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','internal_test','release_ready','published','paused','retired')),
  player_r2_key TEXT,
  guide_r2_key TEXT,
  player_sha256 TEXT,
  guide_sha256 TEXT,
  licence_version TEXT,
  published_at TEXT,
  UNIQUE (theme_world_id, setting, version)
);

CREATE TABLE IF NOT EXISTS price_versions (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL CHECK (sku IN ('ready_home','ready_classroom','custom_home','custom_classroom')),
  currency TEXT NOT NULL CHECK (currency = 'USD'),
  unit_amount INTEGER NOT NULL CHECK (unit_amount >= 0),
  stripe_price_id TEXT UNIQUE,
  tax_behavior TEXT NOT NULL CHECK (tax_behavior IN ('unknown','inclusive','exclusive')),
  sale_enabled INTEGER NOT NULL DEFAULT 0 CHECK (sale_enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  product_kind TEXT NOT NULL CHECK (product_kind IN ('ready','custom')),
  sku TEXT NOT NULL,
  purchase_spec_json TEXT NOT NULL,
  purchase_spec_sha256 TEXT NOT NULL,
  purchaser_email_hash TEXT NOT NULL,
  price_version_id TEXT NOT NULL REFERENCES price_versions(id),
  amount_total INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency = 'USD'),
  status TEXT NOT NULL CHECK (status IN ('pending_payment','paid','fulfilling','published','failed','refunded')),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS custom_activities (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  status TEXT NOT NULL CHECK (status IN ('queued','generating','validating','published','failed')),
  story_spec_json TEXT NOT NULL,
  generated_at TEXT,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS artifact_versions (
  id TEXT PRIMARY KEY,
  custom_activity_id TEXT NOT NULL REFERENCES custom_activities(id),
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  status TEXT NOT NULL CHECK (status IN ('validating','published','rejected')),
  player_r2_key TEXT,
  guide_r2_key TEXT,
  player_sha256 TEXT,
  guide_sha256 TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (custom_activity_id, version_number)
);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  ready_pack_id TEXT REFERENCES ready_packs(id),
  custom_activity_id TEXT REFERENCES custom_activities(id),
  status TEXT NOT NULL CHECK (status IN ('active','suspended','revoked')),
  revision_success_limit INTEGER NOT NULL DEFAULT 0,
  revision_success_used INTEGER NOT NULL DEFAULT 0,
  revision_expires_at TEXT,
  access_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((ready_pack_id IS NOT NULL) <> (custom_activity_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id TEXT,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_ref TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS orders_email_hash_idx ON orders(purchaser_email_hash);
CREATE INDEX IF NOT EXISTS entitlements_order_idx ON entitlements(order_id);
CREATE INDEX IF NOT EXISTS ready_packs_world_setting_idx ON ready_packs(theme_world_id, setting, status);
