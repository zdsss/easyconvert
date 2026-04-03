import { Router, Request, Response } from 'express';
import db from '../db';
import { serverLogger } from '../lib/logger';

const router = Router();

/** Parse a row's result JSON and extract confidence/quality/language metadata */
function extractCandidate(row: any) {
  let parsed = row.result;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = null; }
  }
  if (!parsed) return null;

  const confidence = parsed?.additional?._confidence;
  let avgConfidence = 0;
  if (confidence && typeof confidence === 'object') {
    const values = Object.values(confidence).filter((v): v is number => typeof v === 'number');
    if (values.length > 0) {
      avgConfidence = values.reduce((sum, v) => sum + v, 0) / values.length;
    }
  }

  const qualityScore = parsed?.additional?.qualityScore ?? null;
  const language = parsed?.additional?.language ?? null;

  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: row.file_size,
    avgConfidence: Math.round(avgConfidence * 1000) / 1000,
    qualityScore,
    language,
    createdAt: row.created_at,
  };
}

/**
 * GET /api/data-flywheel
 * Query completed parse_jobs, return low-confidence candidates.
 * Supports ?threshold=0.6 (default 0.75)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.75;

    const result = await db.query(
      `SELECT id, file_name, file_size, mime_type, result, processing_time, created_at
       FROM parse_jobs
       WHERE status = 'completed' AND tenant_id IS NULL AND result IS NOT NULL
       ORDER BY created_at DESC`
    );

    const candidates = result.rows
      .map((row: any) => extractCandidate(row))
      .filter((c: any) => c !== null)
      .filter((c: any) => c.avgConfidence < threshold)
      .sort((a: any, b: any) => a.avgConfidence - b.avgConfidence);

    res.json({ candidates, total: candidates.length });
  } catch (error) {
    serverLogger.error('Failed to fetch flywheel candidates', error as Error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/data-flywheel/promote
 * Record a candidate promotion to an evaluation task.
 * Body: { candidateId: string, evaluationTaskId: string }
 */
router.post('/promote', async (req: Request, res: Response) => {
  try {
    const { candidateId, evaluationTaskId } = req.body;
    if (!candidateId || !evaluationTaskId) {
      return res.status(400).json({ error: 'candidateId and evaluationTaskId are required' });
    }

    const result = await db.query(
      `INSERT INTO flywheel_promotions (candidate_id, evaluation_task_id) VALUES ($1, $2) RETURNING *`,
      [candidateId, evaluationTaskId]
    );

    const row = result.rows[0];
    res.json({
      id: row.id,
      candidateId: row.candidate_id,
      evaluationTaskId: row.evaluation_task_id,
      promotedAt: row.promoted_at,
    });
  } catch (error) {
    serverLogger.error('Failed to promote candidate', error as Error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/data-flywheel/stats
 * Return aggregate statistics for flywheel candidates.
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, file_name, file_size, mime_type, result, processing_time, created_at
       FROM parse_jobs
       WHERE status = 'completed' AND tenant_id IS NULL AND result IS NOT NULL
       ORDER BY created_at DESC`
    );

    const allCandidates = result.rows
      .map((row: any) => extractCandidate(row))
      .filter((c: any) => c !== null);

    const belowThreshold = allCandidates.filter((c: any) => c.avgConfidence < 0.75);

    const avgConfidence = allCandidates.length > 0
      ? Math.round(
          (allCandidates.reduce((sum: number, c: any) => sum + c.avgConfidence, 0) / allCandidates.length) * 1000
        ) / 1000
      : 0;

    const languageDistribution: Record<string, number> = {};
    for (const c of allCandidates) {
      const lang = (c as any).language || 'unknown';
      languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
    }

    res.json({
      totalCandidates: belowThreshold.length,
      avgConfidence,
      languageDistribution,
    });
  } catch (error) {
    serverLogger.error('Failed to fetch flywheel stats', error as Error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
