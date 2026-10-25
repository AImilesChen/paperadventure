UPDATE price_versions SET sale_enabled=0 WHERE sku IN ('custom_home','custom_classroom','ready_home','ready_classroom');
UPDATE price_versions SET sale_enabled=1 WHERE id IN ('stripe-live-custom-home-20261025','stripe-live-custom-classroom-20261025','stripe-live-ready-home-20261025','stripe-live-ready-classroom-20261025');
UPDATE ready_packs SET status='published',published_at=COALESCE(published_at,CURRENT_TIMESTAMP) WHERE status='internal_test' AND theme_world_id<>'celebration' AND (SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id=ready_packs.id AND f.bytes>0 AND LENGTH(f.sha256)=64)=4;
UPDATE ready_pack_variants SET status='published' WHERE status='internal_test' AND ready_pack_id IN (SELECT id FROM ready_packs WHERE status='published');
