-- Explicit owner-requested recovery for the pre-semantic failure on this order.
-- Consumed atomically when the owner starts it; never queues generation here.
ALTER TABLE custom_plan_orders ADD COLUMN semantic_recovery_remaining INTEGER NOT NULL DEFAULT 0 CHECK (semantic_recovery_remaining IN (0,1));

UPDATE custom_plan_orders
SET semantic_recovery_remaining = 1, updated_at = CURRENT_TIMESTAMP
WHERE order_id = '79bb86c7-93b0-4088-ba7a-4a04cd1b2f34'
  AND status = 'confirmed' AND confirmed_version IS NOT NULL AND quality_replan_used = 0
  AND EXISTS (SELECT 1 FROM orders o WHERE o.id = custom_plan_orders.order_id AND o.status = 'published' AND o.paid_at IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM custom_plan_versions v WHERE v.order_id = custom_plan_orders.order_id AND v.version_number > custom_plan_orders.confirmed_version)
  AND (SELECT g.error_code FROM generation_usage g WHERE g.order_id = custom_plan_orders.order_id AND g.status = 'plan-failed' ORDER BY g.attempt DESC LIMIT 1) = 'PLAN_THEME_ANCHORS'
  AND EXISTS (SELECT 1 FROM custom_plan_requests r WHERE r.id = (SELECT latest.id FROM custom_plan_requests latest WHERE latest.order_id = custom_plan_orders.order_id AND latest.kind = 'full' AND latest.base_version = custom_plan_orders.confirmed_version ORDER BY latest.created_at DESC,latest.rowid DESC LIMIT 1)
    AND r.status = 'failed' AND r.attempts > 0 AND NOT EXISTS (SELECT 1 FROM custom_plan_work w WHERE w.request_id = r.id));
