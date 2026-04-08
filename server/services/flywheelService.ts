import db from '../db';

export interface FlywheelCandidate {
  id: string;
  fileName: string;
  fileSize: number;
  avgConfidence: number;
  qualityScore: number | null;
  language: string | null;
  createdAt: string;
}

/** Parse a row's result JSON and extract confidence/quality/language metadata */
function extractCandidate(row: Record<string, unknown>): FlywheelCandidate | null {
  let parsed = row.result as Record<string, unknown> | null;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = null; }
  }
  if (!parsed) return null;

  const additional = parsed?.additional as Record<string, unknown> | undefined;
  const confidence = additional?._confidence;
  let avgConfidence = 0;
  if (confidence && typeof confidence === 'object') {
    const values = Object.values(confidence as Record<string, unknown>).filter((v): v is number => typeof v === 'number');
    if (values.length > 0) {
      avgConfidence = values.reduce((sum, v) => sum + v, 0) / values.length;
    }
  }

  const qualityScore = (additional?.qualityScore as number) ?? null;
  const language = (additional?.language as string) ?? null;

  return {
    id: row.id as string,
    fileName: row.file_name as string,
    fileSize: row.file_size as number,
    avgConfidence: Math.round(avgConfidence * 1000) / 1000,
    qualityScore,
    language,
    createdAt: row.created_at as string,
  };
}

async function fetchCompletedJobs() {
  return db.query(
    `SELECT id, file_name, file_size, mime_type, result, processing_time, created_at
     FROM parse_jobs
     WHERE status = 'completed' AND tenant_id IS NULL AND result IS NOT NULL
     ORDER BY created_at DESC`
  );
}

export async function getCandidates(threshold = 0.75) {
  const result = await fetchCompletedJobs();
  const candidates = result.rows
    .map((row: Record<string, unknown>) => extractCandidate(row))
    .filter((c): c is FlywheelCandidate => c !== null)
    .filter((c) => c.avgConfidence < threshold)
    .sort((a, b) => a.avgConfidence - b.avgConfidence);

  return { candidates, total: candidates.length };
}

export async function promote(candidateId: string, evaluationTaskId: string) {
  const result = await db.query(
    `INSERT INTO flywheel_promotions (candidate_id, evaluation_task_id) VALUES ($1, $2) RETURNING *`,
    [candidateId, evaluationTaskId]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    candidateId: row.candidate_id,
    evaluationTaskId: row.evaluation_task_id,
    promotedAt: row.promoted_at,
  };
}

export async function getStats() {
  const result = await fetchCompletedJobs();
  const allCandidates = result.rows
    .map((row: Record<string, unknown>) => extractCandidate(row))
    .filter((c): c is FlywheelCandidate => c !== null);

  const belowThreshold = allCandidates.filter((c) => c.avgConfidence < 0.75);

  const avgConfidence = allCandidates.length > 0
    ? Math.round(
        (allCandidates.reduce((sum, c) => sum + c.avgConfidence, 0) / allCandidates.length) * 1000
      ) / 1000
    : 0;

  const languageDistribution: Record<string, number> = {};
  for (const c of allCandidates) {
    const lang = c.language || 'unknown';
    languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
  }

  return { totalCandidates: belowThreshold.length, avgConfidence, languageDistribution };
}
