-- 009_webhook_columns.sql — Add webhook support to parse_jobs

ALTER TABLE parse_jobs ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE parse_jobs ADD COLUMN IF NOT EXISTS webhook_status VARCHAR(20);
