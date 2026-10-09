-- Test-only inline Stripe prices. Live sale flags remain disabled by Worker gates.
INSERT OR IGNORE INTO price_versions (id,sku,currency,unit_amount,stripe_price_id,tax_behavior,sale_enabled) VALUES
  ('stripe-test-custom-home-v1','custom_home','USD',1499,NULL,'exclusive',1),
  ('stripe-test-custom-classroom-v1','custom_classroom','USD',1999,NULL,'exclusive',1);
