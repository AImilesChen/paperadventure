-- Keep a customer-visible record of each full-PDF attempt, separate from plan and revision work.
-- Existing rows retain their result and timestamp; their earlier stage and exact cause were not recorded.
ALTER TABLE generation_usage ADD COLUMN phase TEXT;
ALTER TABLE generation_usage ADD COLUMN round_number INTEGER;
ALTER TABLE generation_usage ADD COLUMN trigger_kind TEXT;
ALTER TABLE generation_usage ADD COLUMN completed_at TEXT;
ALTER TABLE generation_usage ADD COLUMN error_code TEXT;
