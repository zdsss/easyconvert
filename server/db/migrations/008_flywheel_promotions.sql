CREATE TABLE IF NOT EXISTS flywheel_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  evaluation_task_id UUID NOT NULL,
  promoted_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flywheel_promotions_candidate ON flywheel_promotions(candidate_id);
