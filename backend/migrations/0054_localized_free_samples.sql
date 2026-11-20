-- Additive language editions. Never insert translated files into ready_packs:
-- English checkout/catalogue/sample selection continues to use those tables.
CREATE TABLE IF NOT EXISTS localized_free_packs (
 id TEXT PRIMARY KEY,
 locale TEXT NOT NULL,
 setting TEXT NOT NULL CHECK (setting IN ('home','classroom')),
 version TEXT NOT NULL,
 source_english_version TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','withdrawn')),
 published_at TEXT,
 UNIQUE(locale,setting,version)
);
CREATE TABLE IF NOT EXISTS localized_free_pack_files (
 pack_id TEXT NOT NULL REFERENCES localized_free_packs(id),
 paper TEXT NOT NULL CHECK (paper IN ('A4','Letter')),
 role TEXT NOT NULL CHECK (role IN ('player','guide')),
 r2_key TEXT NOT NULL,
 sha256 TEXT NOT NULL CHECK (length(sha256)=64),
 bytes INTEGER NOT NULL CHECK (bytes>0),
 PRIMARY KEY(pack_id,paper,role)
);
CREATE INDEX IF NOT EXISTS localized_free_pack_release
 ON localized_free_packs(locale,setting,status,published_at);
