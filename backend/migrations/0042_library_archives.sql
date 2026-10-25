-- Library visibility only. Orders, payments, support and download rights stay intact.
CREATE TABLE library_order_archives (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  reason TEXT NOT NULL CHECK (reason IN ('unfinished','unpaid_checkout')),
  archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cleanup_ref TEXT
);
CREATE TABLE library_draft_archives (
  id TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  source_updated_at TEXT NOT NULL,
  removed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  restored_at TEXT,
  cleanup_ref TEXT
);
CREATE INDEX library_draft_archives_owner ON library_draft_archives(email_hash,removed_at);
CREATE TABLE library_cleanup_audits (
  id TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  cutoff TEXT NOT NULL,
  applied_at TEXT
);
-- A delayed successful payment must become visible. Completing a pack also returns it.
CREATE TRIGGER library_unarchive_paid_checkout AFTER UPDATE OF paid_at ON orders
WHEN NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL
BEGIN
  DELETE FROM library_order_archives WHERE order_id=NEW.id AND reason='unpaid_checkout';
END;
CREATE TRIGGER library_unarchive_completed_order AFTER UPDATE OF status ON orders
WHEN NEW.status='published' AND OLD.status!='published'
BEGIN
  DELETE FROM library_order_archives WHERE order_id=NEW.id AND reason='unfinished';
END;
