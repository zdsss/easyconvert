import { Router, Request, Response } from 'express';
import db from '../db';
import { serverLogger } from '../lib/logger';

const router = Router();

/**
 * @openapi
 * /parse-history:
 *   get:
 *     summary: 分页列出解析历史
 *     tags: [ParseHistory]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, failed, processing, pending]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 历史记录列表
 *       500:
 *         description: 服务器错误
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    let where = 'WHERE tenant_id IS NULL';
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (status && ['completed', 'failed', 'processing', 'pending'].includes(status)) {
      where += ` AND status = $${paramIdx++}`;
      params.push(status);
    }
    if (search) {
      where += ` AND file_name ILIKE $${paramIdx++}`;
      params.push(`%${search}%`);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM parse_jobs ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0');

    const dataResult = await db.query(
      `SELECT id, status, file_name, file_hash, file_size, mime_type, error, processing_time, created_at, completed_at
       FROM parse_jobs ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    res.json({ items: dataResult.rows, total, page, limit });
  } catch (error) {
    serverLogger.error('Failed to list parse history', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @openapi
 * /parse-history/{id}:
 *   get:
 *     summary: 获取单条解析历史详情（含 result）
 *     tags: [ParseHistory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 历史记录详情
 *       404:
 *         description: 记录不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT * FROM parse_jobs WHERE id = $1 AND tenant_id IS NULL', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    const row = result.rows[0];
    if (typeof row.result === 'string') {
      try { row.result = JSON.parse(row.result); } catch { /* keep as string */ }
    }
    res.json(row);
  } catch (error) {
    serverLogger.error('Failed to get parse history', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/parse-history — 保存解析结果
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { fileName, fileHash, fileSize, mimeType, status, result, error, processingTime } = req.body;

    if (!fileName || !status) {
      return res.status(400).json({ error: 'fileName and status are required' });
    }

    const dbResult = await db.query(
      `INSERT INTO parse_jobs (tenant_id, api_key_id, file_name, file_hash, file_size, mime_type, status, result, error, processing_time, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [null, null, fileName, fileHash || null, fileSize || 0, mimeType || 'application/octet-stream',
       status, result ? JSON.stringify(result) : null, error || null, processingTime || null, new Date().toISOString()]
    );

    const row = dbResult.rows[0];
    if (typeof row.result === 'string') {
      try { row.result = JSON.parse(row.result); } catch { /* keep as string */ }
    }
    res.status(201).json(row);
  } catch (error) {
    serverLogger.error('Failed to save parse history', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @openapi
 * /parse-history/{id}:
 *   delete:
 *     summary: 删除单条解析历史
 *     tags: [ParseHistory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await db.query('DELETE FROM parse_jobs WHERE id = $1 AND tenant_id IS NULL', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    serverLogger.error('Failed to delete parse history', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @openapi
 * /parse-history:
 *   delete:
 *     summary: 清空全部前端解析历史
 *     tags: [ParseHistory]
 *     responses:
 *       200:
 *         description: 清空成功
 *       500:
 *         description: 服务器错误
 */
router.delete('/', async (_req: Request, res: Response) => {
  try {
    await db.query('DELETE FROM parse_jobs WHERE tenant_id IS NULL');
    res.json({ success: true });
  } catch (error) {
    serverLogger.error('Failed to clear parse history', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
