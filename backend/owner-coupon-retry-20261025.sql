-- The owner confirmed Coupons Write on the existing live key after the first 403.
-- Reset precisely that one failed setup; never touch a ready coupon or any purchase.
UPDATE checkout_promotions SET status='pending',error_code=NULL,lease_until=0,updated_at=CURRENT_TIMESTAMP
WHERE id='owner-live-check-20261025' AND status='permission_denied' AND setup_attempts=1 AND error_code='COUPONS_WRITE_REQUIRED';
INSERT INTO admin_action_log(actor_hash,action,target_kind,target_id,details_json)
SELECT 'owner-confirmed-permission','payment_check_coupon_retry','promotion','owner-live-check-20261025','{"previousAttempt":1,"reason":"owner_confirmed_Coupons_Write"}' WHERE changes()=1;
