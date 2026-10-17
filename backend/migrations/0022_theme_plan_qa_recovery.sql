ALTER TABLE custom_plan_orders ADD COLUMN quality_replan_qa_grant INTEGER NOT NULL DEFAULT 0 CHECK (quality_replan_qa_grant IN (0,1));

UPDATE custom_plan_orders
SET quality_replan_qa_grant = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE confirmed_version IS NOT NULL
  AND quality_replan_used = 0
  AND quality_replan_qa_grant = 0
  AND order_id IN (
    SELECT o.id
    FROM orders o
    WHERE o.status = 'published'
      AND (SELECT COUNT(*) FROM custom_plan_requests r WHERE r.order_id = o.id AND r.kind = 'full' AND r.status = 'failed' AND r.attempts > 0) >= 3
      AND (SELECT error_code FROM generation_usage g WHERE g.order_id = o.id AND g.status = 'plan-failed' ORDER BY g.attempt DESC LIMIT 1) LIKE 'PLAN_QA%'
  );
