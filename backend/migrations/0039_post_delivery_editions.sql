-- Successful replacements and candidate attempts are separate rights.
-- Never reset the first-delivery deadline or an already used allowance.
UPDATE entitlements SET revision_success_limit = 3
 WHERE custom_activity_id IS NOT NULL AND revision_success_limit = 2;
ALTER TABLE entitlements ADD COLUMN remake_success_limit INTEGER NOT NULL DEFAULT 2;
ALTER TABLE entitlements ADD COLUMN remake_success_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE artifact_versions ADD COLUMN edition_spec_json TEXT;
ALTER TABLE artifact_versions ADD COLUMN edition_spec_sha256 TEXT;

CREATE TABLE delivery_editions (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES orders(id),
 request_key TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('checkpoint','whole')),
 stage_number INTEGER CHECK(stage_number BETWEEN 1 AND 5),
 feedback TEXT NOT NULL,
 style TEXT,
 base_version INTEGER NOT NULL,
 base_story_sha256 TEXT NOT NULL,
 spec_json TEXT NOT NULL,
 spec_sha256 TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('plan_queued','plan_generating','plan_review','queued','generating','ready','published','discarded','failed')),
 phase TEXT NOT NULL,
 work_json TEXT NOT NULL DEFAULT '{}',
 calls INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER,
 story_r2_key TEXT,story_sha256 TEXT,
 player_r2_key TEXT,player_sha256 TEXT,
 guide_r2_key TEXT,guide_sha256 TEXT,
 edition TEXT,
 error_code TEXT,
 published_version INTEGER,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 completed_at TEXT,
 UNIQUE(order_id,request_key)
);
CREATE UNIQUE INDEX one_active_delivery_edition ON delivery_editions(order_id)
 WHERE status IN ('plan_queued','plan_generating','plan_review','queued','generating','ready');

CREATE TRIGGER edition_excludes_legacy BEFORE INSERT ON delivery_editions
 WHEN EXISTS(SELECT 1 FROM revision_requests WHERE order_id=NEW.order_id AND status IN ('queued','generating'))
 OR EXISTS(SELECT 1 FROM revision_previews WHERE order_id=NEW.order_id AND status IN ('queued','generating','ready'))
 OR EXISTS(SELECT 1 FROM custom_pack_remakes WHERE order_id=NEW.order_id AND status IN ('queued','generating'))
BEGIN SELECT RAISE(ABORT,'EDITION_BUSY'); END;
CREATE TRIGGER legacy_preview_excludes_edition BEFORE INSERT ON revision_previews
 WHEN EXISTS(SELECT 1 FROM delivery_editions WHERE order_id=NEW.order_id AND status IN ('plan_queued','plan_generating','plan_review','queued','generating','ready'))
BEGIN SELECT RAISE(ABORT,'EDITION_BUSY'); END;
CREATE TRIGGER legacy_revision_excludes_edition BEFORE INSERT ON revision_requests
 WHEN EXISTS(SELECT 1 FROM delivery_editions WHERE order_id=NEW.order_id AND status IN ('plan_queued','plan_generating','plan_review','queued','generating','ready'))
BEGIN SELECT RAISE(ABORT,'EDITION_BUSY'); END;
CREATE TRIGGER legacy_remake_excludes_edition BEFORE UPDATE OF status ON custom_pack_remakes
 WHEN NEW.status IN ('queued','generating') AND EXISTS(SELECT 1 FROM delivery_editions WHERE order_id=NEW.order_id AND status IN ('plan_queued','plan_generating','plan_review','queued','generating','ready'))
BEGIN SELECT RAISE(ABORT,'EDITION_BUSY'); END;
CREATE TRIGGER legacy_remake_insert_excludes_edition BEFORE INSERT ON custom_pack_remakes
 WHEN NEW.status IN ('queued','generating') AND EXISTS(SELECT 1 FROM delivery_editions WHERE order_id=NEW.order_id AND status IN ('plan_queued','plan_generating','plan_review','queued','generating','ready'))
BEGIN SELECT RAISE(ABORT,'EDITION_BUSY'); END;

-- One compare-and-swap statement publishes the pair and spends exactly one
-- successful allowance. D1 executes both triggers in the same transaction.
CREATE TRIGGER delivery_edition_accept_guard BEFORE UPDATE OF status ON delivery_editions
 WHEN NEW.status='published' AND OLD.status!='published'
BEGIN
 SELECT CASE WHEN OLD.status!='ready' OR NEW.published_version!=OLD.base_version+1
  OR NEW.story_r2_key IS NULL OR NEW.player_r2_key IS NULL OR NEW.guide_r2_key IS NULL
  OR NOT EXISTS(SELECT 1 FROM orders o JOIN entitlements e ON e.order_id=o.id
   JOIN custom_activities a ON a.order_id=o.id JOIN artifact_versions v ON v.custom_activity_id=a.id
   WHERE o.id=OLD.order_id AND o.status='published' AND e.status='active'
    AND e.access_expires_at>CURRENT_TIMESTAMP AND e.revision_expires_at>CURRENT_TIMESTAMP
    AND ((OLD.kind='checkpoint' AND e.revision_success_used<e.revision_success_limit)
      OR (OLD.kind='whole' AND e.remake_success_used<e.remake_success_limit))
    AND v.status='published' AND v.version_number=OLD.base_version AND v.story_sha256=OLD.base_story_sha256
    AND NOT EXISTS(SELECT 1 FROM artifact_versions n WHERE n.custom_activity_id=a.id AND n.status='published' AND n.version_number>v.version_number))
 THEN RAISE(ABORT,'EDITION_ACCEPT_CONFLICT') END;
END;
CREATE TRIGGER delivery_edition_accept AFTER UPDATE OF status ON delivery_editions
 WHEN NEW.status='published' AND OLD.status='ready'
BEGIN
 INSERT INTO artifact_versions(id,custom_activity_id,version_number,status,player_r2_key,guide_r2_key,player_sha256,guide_sha256,story_r2_key,story_sha256,pack_format_version,edition_spec_json,edition_spec_sha256)
 SELECT 'edition-'||NEW.id,a.id,NEW.published_version,'published',NEW.player_r2_key,NEW.guide_r2_key,NEW.player_sha256,NEW.guide_sha256,NEW.story_r2_key,NEW.story_sha256,2,NEW.spec_json,NEW.spec_sha256
 FROM custom_activities a WHERE a.order_id=NEW.order_id;
 UPDATE entitlements SET revision_success_used=revision_success_used+CASE WHEN NEW.kind='checkpoint' THEN 1 ELSE 0 END,
  remake_success_used=remake_success_used+CASE WHEN NEW.kind='whole' THEN 1 ELSE 0 END WHERE order_id=NEW.order_id;
END;
