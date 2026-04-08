import { Router, Request, Response } from 'express';
import db from '../db';
import { serverLogger } from '../lib/logger';

const router = Router();

interface FlywheelCandidate {
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
      .map((row: Record<string, unknown>) => extractCandidate(row))
      .filter((c): c is FlywheelCandidate => c !== null)
      .filter((c) => c.avgConfidence < threshold)
      .sort((a, b) => a.avgConfidence - b.avgConfidence);

    res.json({ candidates, total: candidates.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to fetch flywheel candidates', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to promote candidate', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
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

    res.json({
      totalCandidates: belowThreshold.length,
      avgConfidence,
      languageDistribution,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to fetch flywheel stats', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

export default router;
