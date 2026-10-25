-- Owner-requested $8.99 off one $9.99 ready-made home purchase. No order or charge is created.
CREATE TABLE checkout_promotions (
 id TEXT PRIMARY KEY, code_hash TEXT NOT NULL, stripe_coupon_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','permission_denied','failed','expired')),
 setup_attempts INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
 error_code TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO checkout_promotions(id,code_hash,stripe_coupon_id) VALUES('owner-live-check-20261025','a3d9826cf016398ce828c902d5fce059835729f859c3291ca228d03516d218eb','paw-owner-live-check-899-20261025');

CREATE TABLE checkout_promotion_redemptions (
 promotion_id TEXT PRIMARY KEY REFERENCES checkout_promotions(id),
 order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER checkout_promotion_one_purchase BEFORE INSERT ON checkout_promotion_redemptions
WHEN EXISTS(SELECT 1 FROM checkout_promotion_redemptions WHERE promotion_id=NEW.promotion_id AND order_id!=NEW.order_id)
BEGIN SELECT RAISE(ABORT,'Promotion already redeemed'); END;
