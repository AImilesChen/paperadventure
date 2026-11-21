-- Paid language editions supplement existing English slots and paid entitlements.
-- Never replace ready_pack_files, orders or entitlements to publish a translation.
CREATE TABLE IF NOT EXISTS localized_ready_packs (
 id TEXT PRIMARY KEY,
 ready_pack_id TEXT NOT NULL REFERENCES ready_packs(id),
 locale TEXT NOT NULL,
 version TEXT NOT NULL,
 source_english_version TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','withdrawn')),
 published_at TEXT,
 UNIQUE(ready_pack_id,locale,version)
);
CREATE TABLE IF NOT EXISTS localized_ready_pack_files (
 pack_id TEXT NOT NULL REFERENCES localized_ready_packs(id),
 paper TEXT NOT NULL CHECK(paper IN ('A4','Letter')),
 role TEXT NOT NULL CHECK(role IN ('player','guide')),
 r2_key TEXT NOT NULL,
 sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 bytes INTEGER NOT NULL CHECK(bytes>0),
 PRIMARY KEY(pack_id,paper,role)
);
CREATE INDEX IF NOT EXISTS localized_ready_release ON localized_ready_packs(ready_pack_id,locale,status,published_at);
