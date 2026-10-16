-- A failed free correction did not deliver a plan and must not permanently
-- consume the correction flag. The API separately limits customer attempts.
UPDATE custom_plan_orders
SET quality_replan_used = 0, updated_at = CURRENT_TIMESTAMP
WHERE quality_replan_used = 1 AND status = 'confirmed' AND confirmed_version IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM orders o WHERE o.id = custom_plan_orders.order_id AND o.status = 'published'
  )
  AND EXISTS (
    SELECT 1 FROM custom_plan_requests r
    WHERE r.order_id = custom_plan_orders.order_id AND r.kind = 'full'
      AND r.base_version = custom_plan_orders.confirmed_version AND r.status = 'failed'
  )
  AND NOT EXISTS (
    SELECT 1 FROM custom_plan_versions v
    WHERE v.order_id = custom_plan_orders.order_id
      AND v.version_number > custom_plan_orders.confirmed_version
  );
