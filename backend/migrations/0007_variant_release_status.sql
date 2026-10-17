-- Variant files require their own content approval, independent of the base pack.
ALTER TABLE ready_pack_variants
  ADD COLUMN status TEXT NOT NULL DEFAULT 'internal_test'
  CHECK (status IN ('draft','internal_test','release_ready','published','paused','retired'));
