-- A paid customer may restart one failed PDF delivery on the same order.
-- Count PDF failures separately from the earlier paid-plan generation phase.
ALTER TABLE custom_activities ADD COLUMN delivery_retry_used INTEGER NOT NULL DEFAULT 0 CHECK (delivery_retry_used IN (0,1));
ALTER TABLE custom_activities ADD COLUMN delivery_retry_baseline INTEGER NOT NULL DEFAULT 0;
