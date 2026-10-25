-- Owner-approved two-cover check only, after the fixed Worker is live.
-- Legacy redirect:error failed before network I/O; retain that failed reservation in audit.
INSERT OR IGNORE INTO audit_events(id,actor_type,actor_ref,action,target_type,target_id)
SELECT 'cover-redirect-fix-20261025-'||c.order_id,'operator','approved-cover-check','cover_recovery_pending','order_theme_cover',c.order_id
FROM order_theme_covers c JOIN orders o ON o.id=c.order_id
WHERE c.order_id IN ('a658793a-c546-452a-a5ee-74305eb4a5ee','dc1a8305-c29b-442c-86b2-79dea8f01704')
AND c.status='failed' AND c.error_code='COVER_NETWORK' AND c.generation_calls=1 AND c.request_id IS NULL
AND o.paid_at IS NOT NULL AND o.status IN ('paid','fulfilling','published','failed');

UPDATE order_theme_covers SET status='queued',generation_calls=0,error_code=NULL,lease_until=0,next_check_at=0,poll_count=0,
expires_at=CAST(strftime('%s','now') AS INTEGER)+3600,updated_at=CURRENT_TIMESTAMP
WHERE order_id IN (SELECT target_id FROM audit_events WHERE id='cover-redirect-fix-20261025-'||target_id AND action='cover_recovery_pending');

UPDATE audit_events SET action='cover_pre_dispatch_recovery_applied'
WHERE action='cover_recovery_pending' AND id='cover-redirect-fix-20261025-'||target_id;
