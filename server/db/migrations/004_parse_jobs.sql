-- 004_parse_jobs.sql — 异步解析任务表

CREATE TABLE IF NOT EXISTS parse_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  file_name VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64),
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  result JSONB,
  error TEXT,
  processing_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parse_jobs_tenant_id ON parse_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parse_jobs_status ON parse_jobs(status);
CREATE INDEX IF NOT EXISTS idx_parse_jobs_created_at ON parse_jobs(created_at DESC);
