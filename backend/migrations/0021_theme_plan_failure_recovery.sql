-- Only already failed, pre-fix theme corrections receive one extra explicit
-- attempt. This migration does not enqueue work or change the original PDFs.
ALTER TABLE custom_plan_orders ADD COLUMN quality_replan_recovery_grant INTEGER NOT NULL DEFAULT 0 CHECK(quality_replan_recovery_grant IN (0,1));

UPDATE custom_plan_orders
SET quality_replan_recovery_grant = 1, updated_at = CURRENT_TIMESTAMP
WHERE status = 'confirmed' AND confirmed_version IS NOT NULL AND quality_replan_used = 0
  AND EXISTS (SELECT 1 FROM orders o WHERE o.id = custom_plan_orders.order_id AND o.status = 'published')
  AND (SELECT COUNT(*) FROM custom_plan_requests r
       WHERE r.order_id = custom_plan_orders.order_id AND r.kind = 'full'
         AND r.base_version = custom_plan_orders.confirmed_version
         AND r.status = 'failed' AND r.attempts > 0) >= 2
  AND NOT EXISTS (SELECT 1 FROM custom_plan_versions v
                  WHERE v.order_id = custom_plan_orders.order_id
                    AND v.version_number > custom_plan_orders.confirmed_version);
