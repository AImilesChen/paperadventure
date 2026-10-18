-- Reserve one deterministic recovery for the paid Clock Tower order after the
-- previous scoped retry exposed an unprinted-location consequence. The worker
-- rebuilds that consequence only from saved player-visible labels and facts;
-- this grant does not authorize another provider request.
CREATE TABLE IF NOT EXISTS custom_blueprint_deterministic_recovery_grants (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  extra_calls INTEGER NOT NULL CHECK (extra_calls = 1),
  reason_code TEXT NOT NULL CHECK (reason_code = 'UNPRINTED_LOCATION'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO custom_blueprint_deterministic_recovery_grants (order_id,extra_calls,reason_code)
SELECT '583930da-7d53-4810-8d18-ee9bc6df21ef',1,'UNPRINTED_LOCATION'
WHERE EXISTS (
  SELECT 1 FROM orders
  WHERE id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
    AND status = 'failed'
)
AND EXISTS (
  SELECT 1 FROM custom_generation_calls c
  WHERE c.order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
    AND c.phase = 'blueprint' AND c.stage_number = 0
    AND c.status = 'failed' AND c.error_code = 'BLUEPRINT_INVALID'
    AND lower(c.error_detail) LIKE 'checkpoint % story link claims a location absent from its player material:%'
    AND c.id = (
      SELECT latest.id FROM custom_generation_calls latest
      WHERE latest.order_id = c.order_id
        AND latest.phase = 'blueprint' AND latest.stage_number = 0
      ORDER BY latest.created_at DESC,latest.id DESC
      LIMIT 1
    )
)
AND NOT EXISTS (
  SELECT 1 FROM custom_game_blueprints
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
)
AND NOT EXISTS (
  SELECT 1 FROM custom_story_checkpoints
  WHERE order_id = '583930da-7d53-4810-8d18-ee9bc6df21ef'
);
