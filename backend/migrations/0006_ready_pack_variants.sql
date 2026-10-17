-- Alternate classroom wording uses the same SKU and answer logic as its base pack.
-- Records stay private until the parent ready pack is independently published.
CREATE TABLE IF NOT EXISTS ready_pack_variants (
  ready_pack_id TEXT NOT NULL REFERENCES ready_packs(id),
  variant_id TEXT NOT NULL,
  paper TEXT NOT NULL CHECK (paper IN ('A4','Letter')),
  role TEXT NOT NULL CHECK (role IN ('player','guide')),
  r2_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  PRIMARY KEY (ready_pack_id, variant_id, paper, role)
);
