-- Release only the existing, complete v0.1 Celebration Home/Classroom files as free trials.
-- The paid-pack status remains unpublished and no price or entitlement is created.
UPDATE ready_packs
SET status = 'release_ready', licence_version = 'trial-v0.1',
    published_at = COALESCE(published_at, CURRENT_TIMESTAMP)
WHERE id IN ('stage-celebration-home-v0.1', 'stage-celebration-classroom-v0.1')
  AND theme_world_id = 'celebration'
  AND version = 'v0.1'
  AND status IN ('internal_test', 'release_ready')
  AND (SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id = ready_packs.id) = 4
  AND (SELECT COUNT(*) FROM ready_packs p
       WHERE p.id IN ('stage-celebration-home-v0.1', 'stage-celebration-classroom-v0.1')
         AND p.theme_world_id = 'celebration' AND p.version = 'v0.1'
         AND p.status IN ('internal_test', 'release_ready')
         AND (SELECT COUNT(*) FROM ready_pack_files f WHERE f.ready_pack_id = p.id) = 4) = 2;
