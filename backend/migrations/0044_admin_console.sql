-- Owner-authorized operations console. No order replay, refund execution or file changes.
CREATE TABLE account_profiles (
 email_hash TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 google_subject_hash TEXT,
 first_login_at TEXT,
 last_login_at TEXT,
 first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 source TEXT NOT NULL CHECK(source IN ('google','checkout','stripe'))
 ,is_operator INTEGER NOT NULL DEFAULT 0 CHECK(is_operator IN (0,1))
);
CREATE INDEX account_profiles_login ON account_profiles(first_login_at,last_login_at);
CREATE TABLE admin_payment_state (
 order_id TEXT PRIMARY KEY REFERENCES orders(id),
 mode TEXT NOT NULL CHECK(mode IN ('live','test','unknown')),
 succeeded_refund_amount INTEGER,
 refund_state TEXT NOT NULL DEFAULT 'unknown' CHECK(refund_state IN ('none','pending','partial','full','failed','unknown')),
 provider_event_created INTEGER NOT NULL DEFAULT 0,
 checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 ,provider_payment_status TEXT NOT NULL DEFAULT 'unknown'
);
CREATE TABLE admin_message_reviews (
 source_kind TEXT NOT NULL CHECK(source_kind IN ('feedback','support')),
 source_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread','in_progress','resolved')),
 archived_at TEXT,
 internal_note TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(source_kind,source_id)
);
CREATE TABLE admin_refund_transactions (
 refund_id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES orders(id),
 amount INTEGER NOT NULL,
 status TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('live','test')),
 provider_created INTEGER,
 checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE admin_replies (
 id TEXT PRIMARY KEY,
 source_kind TEXT NOT NULL CHECK(source_kind IN ('feedback','support')),
 source_id TEXT NOT NULL,
 recipient_email TEXT NOT NULL,
 subject TEXT NOT NULL,
 body TEXT NOT NULL,
 payload_sha256 TEXT NOT NULL,
 created_by TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','attention')),
 attempts INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 next_attempt_at INTEGER NOT NULL DEFAULT 0,
 error_code TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 sent_at TEXT
);
CREATE INDEX admin_replies_target ON admin_replies(source_kind,source_id,created_at);
CREATE INDEX admin_replies_pending ON admin_replies(status,next_attempt_at);
CREATE TABLE admin_refund_reviews (
 case_id TEXT PRIMARY KEY REFERENCES support_cases(id),
 decision TEXT NOT NULL CHECK(decision IN ('pending','approved','rejected')),
 internal_note TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE admin_action_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_hash TEXT NOT NULL,
 action TEXT NOT NULL,
 target_kind TEXT NOT NULL,
 target_id TEXT NOT NULL,
 details_json TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_action_log_date ON admin_action_log(created_at,id);
CREATE INDEX IF NOT EXISTS admin_orders_customer ON orders(purchaser_email_hash,created_at);
CREATE TABLE admin_settings (
 key TEXT PRIMARY KEY,
 value_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Read-only ledger includes records hidden from the customer library.
CREATE VIEW admin_order_ledger AS
SELECT o.id,o.product_kind,o.sku,o.status,o.currency,o.amount_total,o.purchaser_email_hash,
 o.created_at,o.paid_at,o.stripe_checkout_session_id,o.stripe_payment_intent_id,
 p.email AS customer_email,p.first_login_at,p.last_login_at,
 COALESCE(json_extract(o.purchase_spec_json,'$.proposalTitle'),json_extract(o.purchase_spec_json,'$.customIdea'),json_extract(o.purchase_spec_json,'$.themeId'),o.sku) AS title,
 CASE WHEN o.sku LIKE '%classroom' THEN 'classroom' ELSE 'home' END AS setting,
 CASE WHEN ps.mode IN ('live','test') THEN ps.mode
  WHEN json_extract(o.purchase_spec_json,'$.paymentMode') IN ('live','test') THEN json_extract(o.purchase_spec_json,'$.paymentMode')
  WHEN json_extract(o.purchase_spec_json,'$.legalVersions.testMode') IS NOT NULL OR o.stripe_checkout_session_id LIKE 'cs_test_%' THEN 'test'
  WHEN o.stripe_checkout_session_id LIKE 'cs_live_%' THEN 'live' ELSE 'unknown' END AS payment_mode,
 CASE WHEN o.status='refunded' THEN o.amount_total ELSE COALESCE(ps.succeeded_refund_amount,
  (SELECT MAX(CAST(json_extract(e.details_json,'$.succeededAmount') AS INTEGER)) FROM order_evidence e WHERE e.order_id=o.id AND e.event='refund_webhook'),0) END AS refunded_amount,
 CASE WHEN o.status='refunded' THEN 'full' ELSE COALESCE(ps.refund_state,'unknown') END AS refund_state,
 ps.checked_at AS payment_checked_at,ps.provider_payment_status,
 a.reason AS library_archive_reason,a.archived_at,
 cp.status AS plan_status,ca.status AS activity_status,c.status AS cover_status,
 EXISTS(SELECT 1 FROM entitlements en WHERE en.order_id=o.id AND en.status='active' AND en.access_expires_at>CURRENT_TIMESTAMP) AS access_active,
 EXISTS(SELECT 1 FROM artifact_versions av JOIN custom_activities ac ON ac.id=av.custom_activity_id WHERE ac.order_id=o.id AND av.status='published') AS custom_files,
 (SELECT COUNT(*) FROM order_evidence e WHERE e.order_id=o.id AND e.event IN ('file_served','candidate_preview_served')) AS file_service_events
FROM orders o LEFT JOIN account_profiles p ON p.email_hash=o.purchaser_email_hash
LEFT JOIN admin_payment_state ps ON ps.order_id=o.id
LEFT JOIN library_order_archives a ON a.order_id=o.id
LEFT JOIN custom_plan_orders cp ON cp.order_id=o.id
LEFT JOIN custom_activities ca ON ca.order_id=o.id
LEFT JOIN order_theme_covers c ON c.order_id=o.id;
