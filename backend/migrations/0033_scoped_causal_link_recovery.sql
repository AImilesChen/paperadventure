-- Reserve one provider-free causal revalidation for the paid Clock Tower order.
-- Its saved consequences already passed printed-evidence and location checks;
-- the corrected validator accepts that causal bridge without rewriting content.
CREATE TABLE IF NOT EXISTS custom_blueprint_causal_recovery_grants (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  extra_calls INTEGER NOT NULL CHECK (extra_calls = 1),
  reason_code TEXT NOT NULL CHECK (reason_code = 'PRINTED_CAUSAL_LINK'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO custom_blueprint_causal_recovery_grants (order_id,extra_calls,reason_code)
SELECT '583930da-7d53-4810-8d18-ee9bc6df21ef',1,'PRINTED_CAUSAL_LINK'
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
    AND instr(
      lower(c.error_detail),
      'at least three checkpoint discoveries must link a printed fact to the final action'
    ) > 0
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
