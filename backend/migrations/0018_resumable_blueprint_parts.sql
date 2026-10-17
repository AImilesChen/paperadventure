-- Persist the story frame, each printable material and the closing separately.
-- This lets a retry reuse every successful paid model call instead of buying a
-- second whole blueprint when one small part fails.
CREATE TABLE custom_generation_calls_v2 (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  phase TEXT NOT NULL CHECK (phase IN ('blueprint','blueprint_frame','blueprint_material','blueprint_closing','checkpoint','audit')),
  stage_number INTEGER NOT NULL DEFAULT 0 CHECK (stage_number BETWEEN 0 AND 5),
  status TEXT NOT NULL CHECK (status IN ('started','passed','failed')),
  model TEXT NOT NULL,
  response_id TEXT,
  result_json TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  error_code TEXT,
  error_detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
INSERT INTO custom_generation_calls_v2 SELECT * FROM custom_generation_calls;
DROP TABLE custom_generation_calls;
ALTER TABLE custom_generation_calls_v2 RENAME TO custom_generation_calls;
CREATE INDEX custom_generation_calls_order_step ON custom_generation_calls(order_id,phase,stage_number,id);

CREATE TABLE custom_pack_remake_calls_v2 (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES custom_pack_remakes(order_id),
  phase TEXT NOT NULL CHECK (phase IN ('blueprint','blueprint_frame','blueprint_material','blueprint_closing','checkpoint','audit')),
  stage_number INTEGER NOT NULL DEFAULT 0 CHECK (stage_number BETWEEN 0 AND 5),
  status TEXT NOT NULL CHECK (status IN ('started','passed','failed')),
  model TEXT NOT NULL,
  result_json TEXT,
  response_id TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  error_code TEXT,
  error_detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  round_number INTEGER NOT NULL DEFAULT 1 CHECK (round_number IN (1,2)),
  generation_round INTEGER NOT NULL DEFAULT 1 CHECK (generation_round BETWEEN 1 AND 3),
  logic_epoch INTEGER NOT NULL DEFAULT 0 CHECK (logic_epoch IN (0,1)),
  quality_epoch INTEGER NOT NULL DEFAULT 0
);
INSERT INTO custom_pack_remake_calls_v2
  SELECT id,order_id,phase,stage_number,status,model,result_json,response_id,input_tokens,output_tokens,error_code,error_detail,created_at,completed_at,round_number,generation_round,logic_epoch,quality_epoch
  FROM custom_pack_remake_calls;
DROP TABLE custom_pack_remake_calls;
ALTER TABLE custom_pack_remake_calls_v2 RENAME TO custom_pack_remake_calls;
CREATE INDEX custom_pack_remake_calls_step ON custom_pack_remake_calls(order_id,phase,stage_number,created_at);
CREATE INDEX custom_pack_remake_calls_round ON custom_pack_remake_calls(order_id,round_number,phase,stage_number,created_at);
CREATE INDEX custom_pack_remake_calls_generation_round ON custom_pack_remake_calls(order_id,generation_round,phase,stage_number,created_at);
CREATE INDEX custom_pack_remake_calls_logic_epoch ON custom_pack_remake_calls(order_id,logic_epoch,generation_round,phase,stage_number,created_at);
CREATE INDEX custom_pack_remake_calls_quality_epoch ON custom_pack_remake_calls(order_id,quality_epoch,logic_epoch,generation_round,phase,stage_number,created_at);

