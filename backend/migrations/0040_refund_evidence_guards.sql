-- No old-order replay, allowance reset, automatic refund or legal publication.
CREATE TABLE order_evidence (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id TEXT NOT NULL REFERENCES orders(id),
 event TEXT NOT NULL,
 reference TEXT NOT NULL,
 details_json TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(order_id,event,reference)
);
CREATE INDEX order_evidence_timeline ON order_evidence(order_id,created_at,id);

CREATE TRIGGER refunded_order_is_terminal BEFORE UPDATE OF status ON orders
 WHEN OLD.status='refunded' AND NEW.status!='refunded'
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_revokes_future_access AFTER UPDATE OF status ON orders
 WHEN NEW.status='refunded' AND OLD.status!='refunded'
BEGIN
 UPDATE entitlements SET status='revoked' WHERE order_id=NEW.id;
 UPDATE custom_plan_requests SET status='failed',lease_until=NULL,completed_at=CURRENT_TIMESTAMP WHERE order_id=NEW.id AND status IN ('queued','generating');
 UPDATE custom_activities SET status='failed',lease_until=NULL WHERE order_id=NEW.id AND status IN ('queued','generating','validating');
 UPDATE revision_requests SET status='failed',lease_until=NULL,completed_at=CURRENT_TIMESTAMP WHERE order_id=NEW.id AND status IN ('queued','generating');
 UPDATE revision_previews SET status='failed',error_code='ORDER_REFUNDED',lease_until=NULL,completed_at=CURRENT_TIMESTAMP WHERE order_id=NEW.id AND status IN ('queued','generating','ready');
 UPDATE delivery_editions SET status='failed',error_code='ORDER_REFUNDED',lease_until=NULL,completed_at=CURRENT_TIMESTAMP WHERE order_id=NEW.id AND status IN ('plan_queued','plan_generating','plan_review','queued','generating','ready');
 UPDATE custom_pack_remakes SET status='failed',error_code='ORDER_REFUNDED',lease_until=NULL WHERE order_id=NEW.id AND status IN ('queued','generating');
 UPDATE order_theme_covers SET status='failed',error_code='ORDER_REFUNDED',lease_until=0 WHERE order_id=NEW.id AND status IN ('queued','submitting','pending');
 INSERT OR IGNORE INTO order_evidence(order_id,event,reference) VALUES(NEW.id,'full_refund_confirmed','first');
END;

CREATE TRIGGER plan_approval_evidence AFTER UPDATE OF confirmed_version ON custom_plan_orders
 WHEN NEW.confirmed_version IS NOT NULL AND NEW.confirmed_version IS NOT OLD.confirmed_version
BEGIN
 INSERT OR IGNORE INTO order_evidence(order_id,event,reference,details_json)
 VALUES(NEW.order_id,'plan_approved',CAST(NEW.confirmed_version AS TEXT),json_object('version',NEW.confirmed_version));
END;

CREATE TRIGGER artifact_delivery_evidence AFTER INSERT ON artifact_versions
 WHEN NEW.status='published'
BEGIN
 INSERT OR IGNORE INTO order_evidence(order_id,event,reference,details_json)
 SELECT order_id,'files_published',CAST(NEW.version_number AS TEXT),json_object('version',NEW.version_number,'playerHash',NEW.player_sha256,'guideHash',NEW.guide_sha256)
 FROM custom_activities WHERE id=NEW.custom_activity_id;
END;

CREATE TRIGGER refund_guard_entitlements_insert BEFORE INSERT ON entitlements
 WHEN (NEW.status='active') AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_entitlements_update BEFORE UPDATE ON entitlements
 WHEN (NEW.status='active') AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_custom_plan_requests_insert BEFORE INSERT ON custom_plan_requests
 WHEN (NEW.status IN ('queued','generating','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_custom_plan_requests_update BEFORE UPDATE ON custom_plan_requests
 WHEN (NEW.status IN ('queued','generating','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_custom_plan_orders_insert BEFORE INSERT ON custom_plan_orders
 WHEN (NEW.status IN ('queued','generating','confirmed')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_custom_plan_orders_update BEFORE UPDATE ON custom_plan_orders
 WHEN (NEW.status IN ('queued','generating','confirmed')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_custom_plan_versions_insert BEFORE INSERT ON custom_plan_versions
 WHEN (1) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_custom_plan_versions_update BEFORE UPDATE ON custom_plan_versions
 WHEN (1) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_custom_activities_insert BEFORE INSERT ON custom_activities
 WHEN (NEW.status IN ('queued','generating','validating','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_custom_activities_update BEFORE UPDATE ON custom_activities
 WHEN (NEW.status IN ('queued','generating','validating','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_revision_requests_insert BEFORE INSERT ON revision_requests
 WHEN (NEW.status IN ('queued','generating','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_revision_requests_update BEFORE UPDATE ON revision_requests
 WHEN (NEW.status IN ('queued','generating','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_revision_previews_insert BEFORE INSERT ON revision_previews
 WHEN (NEW.status IN ('queued','generating','ready','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_revision_previews_update BEFORE UPDATE ON revision_previews
 WHEN (NEW.status IN ('queued','generating','ready','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_delivery_editions_insert BEFORE INSERT ON delivery_editions
 WHEN (NEW.status IN ('plan_queued','plan_generating','plan_review','queued','generating','ready','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_delivery_editions_update BEFORE UPDATE ON delivery_editions
 WHEN (NEW.status IN ('plan_queued','plan_generating','plan_review','queued','generating','ready','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_custom_pack_remakes_insert BEFORE INSERT ON custom_pack_remakes
 WHEN (NEW.status IN ('queued','generating','ready')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_custom_pack_remakes_update BEFORE UPDATE ON custom_pack_remakes
 WHEN (NEW.status IN ('queued','generating','ready')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_order_theme_covers_insert BEFORE INSERT ON order_theme_covers
 WHEN (NEW.status IN ('queued','submitting','pending','ready')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_order_theme_covers_update BEFORE UPDATE ON order_theme_covers
 WHEN (NEW.status IN ('queued','submitting','pending','ready')) AND EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_artifact_versions_insert BEFORE INSERT ON artifact_versions
 WHEN (NEW.status IN ('validating','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=(SELECT order_id FROM custom_activities WHERE id=NEW.custom_activity_id) AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;

CREATE TRIGGER refund_guard_artifact_versions_update BEFORE UPDATE ON artifact_versions
 WHEN (NEW.status IN ('validating','published')) AND EXISTS(SELECT 1 FROM orders WHERE id=(SELECT order_id FROM custom_activities WHERE id=NEW.custom_activity_id) AND status='refunded')
BEGIN SELECT RAISE(ABORT,'ORDER_REFUNDED'); END;


