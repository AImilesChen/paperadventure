-- An operator may grant one extra call to one failed material stage without
-- resetting any prior calls or changing the customer's approved plan.
CREATE TABLE IF NOT EXISTS custom_generation_recovery_grants (
  order_id TEXT NOT NULL REFERENCES orders(id),
  phase TEXT NOT NULL CHECK (phase = 'blueprint_material'),
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 4),
  extra_calls INTEGER NOT NULL CHECK (extra_calls = 1),
  reason_code TEXT NOT NULL CHECK (reason_code = 'REPEATED_ORDER_ACTION'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id, phase, stage_number)
);

