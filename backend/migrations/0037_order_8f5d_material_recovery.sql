-- One extra material-label repair is reserved for this paid order only. The
-- migration never queues generation; the purchaser must explicitly continue.
INSERT OR IGNORE INTO custom_generation_recovery_grants
  (order_id,phase,stage_number,extra_calls,reason_code)
SELECT o.id,'blueprint_material',2,1,'REPEATED_ORDER_ACTION'
FROM orders AS o
JOIN custom_activities AS a ON a.order_id = o.id
JOIN custom_plan_orders AS p ON p.order_id = o.id
WHERE o.id = '8f5d8f98-694d-465f-8cef-4d80b9ad6bef'
  AND o.status = 'failed' AND o.paid_at IS NOT NULL
  AND a.status = 'failed' AND a.delivery_retry_used = 0
  AND p.confirmed_version IS NOT NULL
  AND (SELECT COUNT(*) FROM custom_generation_calls AS c
       WHERE c.order_id = o.id AND c.phase = 'blueprint_material'
         AND c.stage_number = 2) = 2
  AND (SELECT COUNT(*) FROM custom_generation_calls AS c
       WHERE c.order_id = o.id) + 6 <= 18
  AND EXISTS (SELECT 1 FROM generation_usage AS u
       WHERE u.order_id = o.id AND u.status = 'failed'
         AND u.error_code = 'STAGED_GENERATION_STOPPED')
  AND EXISTS (SELECT 1 FROM custom_generation_calls AS c
       WHERE c.order_id = o.id AND c.phase = 'blueprint_material'
         AND c.stage_number = 2 AND c.status = 'failed'
         AND c.error_code = 'BLUEPRINT_INVALID'
         AND instr(COALESCE(c.error_detail, ''), 'repeats a printed action from an earlier checkpoint') > 0
         AND c.result_json IS NOT NULL
         AND c.rowid = (SELECT MAX(last.rowid) FROM custom_generation_calls AS last
              WHERE last.order_id = o.id))
  AND NOT EXISTS (SELECT 1 FROM custom_game_blueprints AS b WHERE b.order_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM artifact_versions AS v WHERE v.custom_activity_id = a.id);
