-- Preserve the initial and first recovery model-call history while allowing
-- one more no-charge service recovery when a later checkpoint fails.
ALTER TABLE custom_pack_remakes ADD COLUMN recovery_round INTEGER NOT NULL DEFAULT 0 CHECK (recovery_round BETWEEN 0 AND 2);
UPDATE custom_pack_remakes SET recovery_round = recovery_count;

ALTER TABLE custom_pack_remake_calls ADD COLUMN generation_round INTEGER NOT NULL DEFAULT 1 CHECK (generation_round BETWEEN 1 AND 3);
UPDATE custom_pack_remake_calls SET generation_round = round_number;
CREATE INDEX custom_pack_remake_calls_generation_round ON custom_pack_remake_calls(order_id,generation_round,phase,stage_number,created_at);
