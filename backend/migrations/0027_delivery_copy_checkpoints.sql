-- Keep the original provider draft and lifetime call count. Bind the audit to
-- the exact normalized edition; a compiler change cannot reuse a stale review.
ALTER TABLE custom_delivery_copy ADD COLUMN normalized_json TEXT;
ALTER TABLE custom_delivery_copy ADD COLUMN normalized_sha256 TEXT;
ALTER TABLE custom_delivery_copy ADD COLUMN audit_candidate_sha256 TEXT;
ALTER TABLE custom_delivery_copy ADD COLUMN phase TEXT;
ALTER TABLE custom_delivery_copy ADD COLUMN repair_response_json TEXT;
ALTER TABLE custom_delivery_copy ADD COLUMN audit_response_json TEXT;
