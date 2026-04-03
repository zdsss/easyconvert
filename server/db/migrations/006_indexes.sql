-- 006_indexes.sql — 性能索引补充

-- 复合索引：按租户查询活跃 Key
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_active ON api_keys(tenant_id, is_active) WHERE is_active = TRUE;

-- 复合索引：按租户查询任务
CREATE INDEX IF NOT EXISTS idx_parse_jobs_tenant_status ON parse_jobs(tenant_id, status);

-- 评测结果按文件名查询
CREATE INDEX IF NOT EXISTS idx_evaluation_results_file_name ON evaluation_results(file_name);
