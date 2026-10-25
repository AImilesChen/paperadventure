-- Explicit owner request: 7 unfinished paid orders, 6 unpaid checkouts, 1 saved draft.
-- One-time, reversible, bounded to the verified account and pre-request records.
-- Re-running this file never re-archives anything the owner has restored.
INSERT OR IGNORE INTO library_cleanup_audits(id,email_hash,cutoff)
SELECT 'owner-library-cleanup-20261025',purchaser_email_hash,'2026-10-25 06:13:27'
FROM orders
WHERE UPPER(SUBSTR(id,1,8)) IN ('CC63990C','3ABB0A28')
GROUP BY purchaser_email_hash
HAVING COUNT(*)=2
AND COUNT(DISTINCT UPPER(SUBSTR(id,1,8)))=2
AND (SELECT COUNT(DISTINCT purchaser_email_hash) FROM orders WHERE UPPER(SUBSTR(id,1,8)) IN ('CC63990C','3ABB0A28'))=1
AND (SELECT COUNT(*) FROM orders o WHERE o.purchaser_email_hash=orders.purchaser_email_hash AND o.created_at<='2026-10-25 06:13:27' AND o.paid_at IS NOT NULL AND o.product_kind='custom' AND o.status IN ('paid','fulfilling','failed'))=7
AND (SELECT COUNT(*) FROM orders o WHERE o.purchaser_email_hash=orders.purchaser_email_hash AND o.created_at<='2026-10-25 06:13:27' AND o.paid_at IS NULL)=6
AND (SELECT COUNT(*) FROM adult_drafts d WHERE d.email_hash=orders.purchaser_email_hash AND d.updated_at<='2026-10-25 06:13:27')=1;

INSERT OR IGNORE INTO library_order_archives(order_id,reason,cleanup_ref)
SELECT o.id,CASE WHEN o.paid_at IS NULL THEN 'unpaid_checkout' ELSE 'unfinished' END,a.id
FROM orders o JOIN library_cleanup_audits a ON a.email_hash=o.purchaser_email_hash
WHERE a.id='owner-library-cleanup-20261025' AND a.applied_at IS NULL AND o.created_at<=a.cutoff
AND (o.paid_at IS NULL OR (o.product_kind='custom' AND o.paid_at IS NOT NULL AND o.status IN ('paid','fulfilling','failed')));

INSERT OR IGNORE INTO library_draft_archives(id,email_hash,draft_json,source_updated_at,cleanup_ref)
SELECT 'owner-library-draft-20261025',d.email_hash,d.draft_json,d.updated_at,a.id
FROM adult_drafts d JOIN library_cleanup_audits a ON a.email_hash=d.email_hash
WHERE a.id='owner-library-cleanup-20261025' AND a.applied_at IS NULL AND d.updated_at<=a.cutoff;

DELETE FROM adult_drafts
WHERE EXISTS(SELECT 1 FROM library_draft_archives d JOIN library_cleanup_audits a ON a.id=d.cleanup_ref
WHERE a.id='owner-library-cleanup-20261025' AND a.applied_at IS NULL
AND d.id='owner-library-draft-20261025' AND d.email_hash=adult_drafts.email_hash
AND d.source_updated_at=adult_drafts.updated_at AND d.draft_json=adult_drafts.draft_json);

UPDATE library_cleanup_audits SET applied_at=CURRENT_TIMESTAMP
WHERE id='owner-library-cleanup-20261025' AND applied_at IS NULL;

-- Counts only: never export private draft, account identifiers or purchase settings.
SELECT a.applied_at,
(SELECT COUNT(*) FROM library_order_archives WHERE cleanup_ref=a.id AND reason='unfinished') archived_paid,
(SELECT COUNT(*) FROM library_order_archives WHERE cleanup_ref=a.id AND reason='unpaid_checkout') archived_unpaid,
(SELECT COUNT(*) FROM library_draft_archives WHERE cleanup_ref=a.id AND restored_at IS NULL) removed_drafts,
(SELECT COUNT(*) FROM orders o WHERE o.purchaser_email_hash=a.email_hash AND o.paid_at IS NOT NULL AND o.status='published') completed_games,
(SELECT COUNT(*) FROM orders o WHERE o.purchaser_email_hash=a.email_hash AND o.paid_at IS NOT NULL AND o.product_kind='custom' AND o.status IN ('paid','fulfilling','failed') AND NOT EXISTS(SELECT 1 FROM library_order_archives x WHERE x.order_id=o.id)) active_unfinished,
(SELECT COUNT(*) FROM adult_drafts WHERE email_hash=a.email_hash) active_drafts,
(SELECT COUNT(*) FROM orders o WHERE o.purchaser_email_hash=a.email_hash) retained_orders
FROM library_cleanup_audits a WHERE a.id='owner-library-cleanup-20261025';
