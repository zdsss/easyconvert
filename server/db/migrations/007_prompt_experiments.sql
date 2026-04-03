CREATE TABLE IF NOT EXISTS prompt_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_ids JSONB NOT NULL DEFAULT '[]',
  weak_fields JSONB NOT NULL DEFAULT '[]',
  suggestion TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
