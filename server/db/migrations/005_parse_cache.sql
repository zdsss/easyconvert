-- 005_parse_cache.sql — 服务端缓存表

CREATE TABLE IF NOT EXISTS parse_cache (
  hash VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  version VARCHAR(10) NOT NULL DEFAULT '2.0',
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parse_cache_updated_at ON parse_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_parse_cache_tenant_id ON parse_cache(tenant_id);
