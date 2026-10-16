-- One free theme-plan correction on an already delivered creator-v3 order.
-- Keep the confirmed version and published PDFs until the customer approves
-- the replacement plan and its complete game passes every delivery check.
ALTER TABLE custom_plan_orders ADD COLUMN quality_replan_used INTEGER NOT NULL DEFAULT 0 CHECK(quality_replan_used IN (0,1));
