-- Recover one paid order that exhausted blueprint retries before the global
-- story-chain repair router was fixed. The approved plan and saved materials
-- remain unchanged; this grants exactly one blueprint repair call.
CREATE TABLE IF NOT EXISTS custom_blueprint_recovery_grants (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  extra_calls INTEGER NOT NULL CHECK (extra_calls = 1),
  reason_code TEXT NOT NULL CHECK (reason_code = 'STORY_REPAIR_ROUTING'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO custom_blueprint_recovery_grants (order_id,extra_calls,reason_code)
SELECT '583930da-7d53-4810-8d18-ee9bc6df21ef',1,'STORY_REPAIR_ROUTING'
WHERE EXISTS (
  SELECT 1 FROM orders
  WHERE id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
    AND status = 'failed'
)
AND (
  SELECT COUNT(*) FROM custom_generation_calls
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
    AND phase = 'blueprint' AND stage_number = 0
) >= 5
AND EXISTS (
  SELECT 1 FROM custom_generation_calls
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
    AND phase = 'blueprint' AND stage_number = 0
    AND status = 'failed' AND error_code = 'BLUEPRINT_INVALID'
)
AND NOT EXISTS (
  SELECT 1 FROM custom_story_checkpoints
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
);

UPDATE custom_activities
SET status = 'queued', lease_until = NULL, pipeline_failures = 0
WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
  AND status = 'failed'
  AND EXISTS (
    SELECT 1 FROM custom_blueprint_recovery_grants
    WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
  );

UPDATE orders
SET status = 'fulfilling'
WHERE id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
  AND status = 'failed'
  AND EXISTS (
    SELECT 1 FROM custom_blueprint_recovery_grants
    WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
  );

UPDATE delivery_notifications
SET status = 'blocked'
WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
  AND kind = 'generation_failed' AND status = 'pending';
