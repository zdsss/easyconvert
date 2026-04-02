-- 评测任务表
CREATE TABLE evaluation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  config JSONB NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}',
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 评测结果表
CREATE TABLE evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES evaluation_tasks(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  parsed_resume JSONB NOT NULL,
  annotation JSONB,
  classification JSONB NOT NULL,
  process_trace JSONB NOT NULL,
  metrics JSONB NOT NULL,
  processing_time INTEGER NOT NULL,
  from_cache BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_evaluation_results_task_id ON evaluation_results(task_id);
CREATE INDEX idx_evaluation_results_file_hash ON evaluation_results(file_hash);
CREATE INDEX idx_evaluation_tasks_status ON evaluation_tasks(status);
CREATE INDEX idx_evaluation_tasks_created_at ON evaluation_tasks(created_at DESC);
