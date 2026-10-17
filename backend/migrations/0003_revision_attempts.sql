-- Count retries per revision request, independent of earlier activity on the order.
ALTER TABLE revision_requests ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
