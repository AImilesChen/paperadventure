-- Additive only. Existing player/guide and ZIP/companion contracts stay intact.
CREATE TABLE IF NOT EXISTS ready_pack_attachments (
 ready_pack_id TEXT NOT NULL REFERENCES ready_packs(id),
 paper TEXT NOT NULL CHECK(paper IN ('A4','Letter')),
 role TEXT NOT NULL CHECK(role IN ('setup','role-A','role-B','role-C')),
 r2_key TEXT NOT NULL,
 sha256 TEXT NOT NULL,
 bytes INTEGER NOT NULL CHECK(bytes > 0),
 PRIMARY KEY(ready_pack_id,paper,role)
);

