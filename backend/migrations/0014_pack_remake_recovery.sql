-- Permit one bounded, no-charge recovery of a failed legacy-pack remake.
-- Previous model calls remain in the audit log and do not consume the new round.
ALTER TABLE custom_pack_remakes ADD COLUMN recovery_count INTEGER NOT NULL DEFAULT 0 CHECK (recovery_count BETWEEN 0 AND 1);
ALTER TABLE custom_pack_remake_calls ADD COLUMN round_number INTEGER NOT NULL DEFAULT 1 CHECK (round_number BETWEEN 1 AND 2);
CREATE INDEX custom_pack_remake_calls_round ON custom_pack_remake_calls(order_id,round_number,phase,stage_number,created_at);
