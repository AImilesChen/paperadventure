-- Reversible admin-only cleanup of historical test exceptions, explicitly requested by the owner.
-- No order, payment, refund, notification, entitlement or file is changed.
CREATE TABLE IF NOT EXISTS admin_exception_archives (
 order_id TEXT PRIMARY KEY REFERENCES orders(id),
 cleanup_ref TEXT NOT NULL,
 archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 restored_at TEXT
);
INSERT OR IGNORE INTO admin_exception_archives(order_id,cleanup_ref)
SELECT o.id,'historical-tests-20261025' FROM admin_order_ledger o
WHERE o.payment_mode='test' AND o.created_at<='2026-10-25 08:17:52'
 AND (o.status='failed' OR o.plan_status IN ('needs_help','review') OR o.cover_status='failed'
  OR (o.provider_payment_status='paid' AND o.paid_at IS NULL)
  OR (o.refunded_amount>=o.amount_total AND o.amount_total>0 AND o.status!='refunded')
  OR o.refund_state='failed'
  OR EXISTS(SELECT 1 FROM admin_refund_transactions t WHERE t.order_id=o.id AND t.status IN ('failed','requires_action'))
  OR EXISTS(SELECT 1 FROM support_cases s JOIN support_case_notifications n ON n.case_id=s.id WHERE s.order_id=o.id AND n.status='attention')
  OR EXISTS(SELECT 1 FROM support_cases s JOIN admin_replies r ON r.source_kind='support' AND r.source_id=s.id WHERE s.order_id=o.id AND r.status='attention'))
 AND NOT EXISTS(SELECT 1 FROM admin_action_log WHERE action='historical_test_exceptions_archived' AND target_id='historical-tests-20261025');
INSERT INTO admin_action_log(actor_hash,action,target_kind,target_id,details_json)
SELECT 'owner-requested-migration','historical_test_exceptions_archived','cleanup','historical-tests-20261025',
 json_object('orders',(SELECT COUNT(*) FROM admin_exception_archives WHERE cleanup_ref='historical-tests-20261025'),'cutoff','2026-10-25 08:17:52','mode','test')
WHERE NOT EXISTS(SELECT 1 FROM admin_action_log WHERE action='historical_test_exceptions_archived' AND target_id='historical-tests-20261025');
