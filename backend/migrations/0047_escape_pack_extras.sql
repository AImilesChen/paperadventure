CREATE TABLE IF NOT EXISTS ready_pack_extras (
 ready_pack_id TEXT NOT NULL REFERENCES ready_packs(id),
 role TEXT NOT NULL CHECK(role IN ('bundle','companion')),
 r2_key TEXT NOT NULL,
 sha256 TEXT NOT NULL,
 bytes INTEGER NOT NULL CHECK(bytes > 0),
 PRIMARY KEY(ready_pack_id,role)
);
