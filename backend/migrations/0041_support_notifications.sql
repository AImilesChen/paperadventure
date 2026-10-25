-- New support requests atomically reserve one operator notification. No historical backfill.
CREATE TABLE support_case_notifications (
 case_id TEXT PRIMARY KEY REFERENCES support_cases(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','attention')),
 attempts INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 next_attempt_at INTEGER NOT NULL DEFAULT 0,
 error_code TEXT,
 sent_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX support_notifications_due ON support_case_notifications(status,next_attempt_at,lease_until);
