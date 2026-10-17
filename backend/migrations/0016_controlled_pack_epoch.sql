-- A failed old remake can restart with checked puzzles without deleting its
-- paid-generation history or colliding with the earlier per-round call budget.
ALTER TABLE custom_pack_remakes ADD COLUMN logic_epoch INTEGER NOT NULL DEFAULT 0 CHECK (logic_epoch IN (0,1));
ALTER TABLE custom_pack_remake_calls ADD COLUMN logic_epoch INTEGER NOT NULL DEFAULT 0 CHECK (logic_epoch IN (0,1));
CREATE INDEX custom_pack_remake_calls_logic_epoch ON custom_pack_remake_calls(order_id,logic_epoch,generation_round,phase,stage_number,created_at);
