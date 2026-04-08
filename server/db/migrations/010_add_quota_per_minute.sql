-- 010_add_quota_per_minute.sql — 补充 tenants 表缺失的 quota_per_minute 列

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quota_per_minute INTEGER DEFAULT 100;
