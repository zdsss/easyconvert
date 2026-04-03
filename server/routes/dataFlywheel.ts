import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

/**
 * GET /api/data-flywheel
 * 查询 parse_jobs 中 status='completed' 的记录，计算平均置信度，返回低置信度候选列表
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, file_name, file_size, mime_type, result, processing_time, created_at
       FROM parse_jobs
       WHERE status = 'completed' AND tenant_id IS NULL AND result IS NOT NULL
       ORDER BY created_at DESC`
    );

    const candidates = result.rows
      .map((row: any) => {
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

        // quality score from additional if available
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
      })
      .filter((c: any) => c !== null)
      .filter((c: any) => c.avgConfidence < 0.75)
      .sort((a: any, b: any) => a.avgConfidence - b.avgConfidence);

    res.json({ candidates, total: candidates.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
