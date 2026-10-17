-- Keep every paid generation attempt while isolating one no-charge quality-rules
-- rebuild from cached calls made with earlier rules.
ALTER TABLE custom_pack_remakes ADD COLUMN quality_epoch INTEGER NOT NULL DEFAULT 0;
ALTER TABLE custom_pack_remake_calls ADD COLUMN quality_epoch INTEGER NOT NULL DEFAULT 0;
CREATE INDEX custom_pack_remake_calls_quality_epoch ON custom_pack_remake_calls(order_id,quality_epoch,logic_epoch,generation_round,phase,stage_number,created_at);
