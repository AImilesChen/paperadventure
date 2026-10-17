-- Add a retryable message when paid custom generation reaches a terminal failure.
CREATE TABLE delivery_notifications_next (
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('payment','files_ready','generation_failed')),
  status TEXT NOT NULL CHECK (status IN ('pending','sent','blocked')),
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT,
  PRIMARY KEY (order_id,kind)
);
INSERT INTO delivery_notifications_next (order_id,kind,status,attempts,sent_at)
  SELECT order_id,kind,status,attempts,sent_at FROM delivery_notifications;
DROP TABLE delivery_notifications;
ALTER TABLE delivery_notifications_next RENAME TO delivery_notifications;
