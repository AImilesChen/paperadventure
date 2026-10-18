-- Restore only the unused downstream work for the paid Clock Tower order.
-- The causal validator fix has already produced a saved blueprint and two checked
-- checkpoints. Historical blueprint failures consumed the order-wide call limit
-- before checkpoint 3 could start, so this grant adds exactly the remaining three
-- checkpoint calls and one final independent audit call.
CREATE TABLE IF NOT EXISTS custom_generation_downstream_recovery_grants (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  extra_calls INTEGER NOT NULL CHECK (extra_calls = 4),
  reason_code TEXT NOT NULL CHECK (reason_code = 'POST_CAUSAL_PIPELINE'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO custom_generation_downstream_recovery_grants (order_id,extra_calls,reason_code)
SELECT '583930da-7d53-4810-8d18-ee9bc6df21ef',4,'POST_CAUSAL_PIPELINE'
WHERE EXISTS (
  SELECT 1 FROM orders
  WHERE id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
    AND status = 'failed'
)
AND EXISTS (
  SELECT 1 FROM custom_activities
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
    AND status = 'failed'
)
AND EXISTS (
  SELECT 1 FROM custom_blueprint_causal_recovery_grants
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
    AND extra_calls = 1
    AND reason_code = 'PRINTED_CAUSAL_LINK'
)
AND EXISTS (
  SELECT 1 FROM custom_game_blueprints
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
)
AND 2 = (
  SELECT COUNT(*) FROM custom_game_stages
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
)
AND 19 <= (
  SELECT COUNT(*) FROM custom_generation_calls
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
)
AND NOT EXISTS (
  SELECT 1 FROM custom_story_checkpoints
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
)
AND NOT EXISTS (
  SELECT 1
  FROM artifact_versions v
  JOIN custom_activities a ON a.id = v.custom_activity_id
  WHERE a.order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
);