import { Router } from 'express';
import { processResume } from '../lib/resumeProcessor';
import { jobQueue } from '../lib/jobQueue';
import { deliverWebhook } from '../lib/webhookDelivery';
import { serverLogger } from '../lib/logger';
import db from '../db';
import type { AuthenticatedRequest } from '../types';
import type { ServerFileInput } from '../lib/types';

const router = Router();

interface WebhookPayload {
  jobId: string;
  status: 'completed' | 'failed';
  completedAt: string;
  result?: unknown;
  error?: string;
}

interface JobResponse {
  jobId: string;
  status: string;
  fileName: string;
  createdAt: string;
  result?: unknown;
  processingTime?: number;
  completedAt?: string;
  error?: string;
}

/**
 * @openapi
 * /parse:
 *   post:
 *     summary: 同步解析简历
 *     tags: [Parse]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 解析成功
 *       400:
 *         description: 缺少文件或参数错误
 *       401:
 *         description: 未授权
 *       429:
 *         description: 请求频率超限
 *       500:
 *         description: 服务器错误
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with field name "file"' });
    }

    const file: ServerFileInput = {
      buffer: req.file.buffer,
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    };

    const result = await processResume(file);

    res.json({
      success: true,
      data: {
        resume: result.resume,
        classification: result.classification,
        difficulty: result.difficultyClass,
        fromCache: result.fromCache,
        hash: result.hash,
        validation: result.validation,
      },
    });
  } catch (error: unknown) {
    serverLogger.error('Parse failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @openapi
 * /parse/async:
 *   post:
 *     summary: 异步解析简历，返回 jobId
 *     tags: [Parse]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       202:
 *         description: 任务已入队
 *       400:
 *         description: 缺少文件
 *       401:
 *         description: 未授权
 *       429:
 *         description: 请求频率超限
 *       500:
 *         description: 服务器错误
 */
router.post('/async', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;
    const webhookUrl: string | undefined = req.body?.webhookUrl;

    // 创建任务记录
    const jobResult = webhookUrl
      ? await db.query(
          `INSERT INTO parse_jobs (tenant_id, api_key_id, file_name, file_size, mime_type, webhook_url)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [req.tenantId || null, req.apiKeyId || null, fileName, fileSize, mimeType, webhookUrl]
        )
      : await db.query(
          `INSERT INTO parse_jobs (tenant_id, api_key_id, file_name, file_size, mime_type)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [req.tenantId || null, req.apiKeyId || null, fileName, fileSize, mimeType]
        );

    const job = jobResult.rows[0];

    // 入队异步处理
    jobQueue.enqueue({
      id: job.id,
      status: 'pending',
      execute: async () => {
        await db.query('UPDATE parse_jobs SET status = $1, started_at = NOW() WHERE id = $2', ['processing', job.id]);

        const file: ServerFileInput = { buffer: fileBuffer, name: fileName, size: fileSize, mimeType };
        const startTime = Date.now();

        let finalStatus: 'completed' | 'failed' = 'completed';
        let jobResult: unknown = null;
        let jobError: string | null = null;

        try {
          const result = await processResume(file);
          jobResult = result.resume;
          await db.query(
            `UPDATE parse_jobs SET status = $1, result = $2, file_hash = $3, processing_time = $4, completed_at = NOW() WHERE id = $5`,
            ['completed', JSON.stringify(result.resume), result.hash, Date.now() - startTime, job.id]
          );
        } catch (error) {
          finalStatus = 'failed';
          jobError = error instanceof Error ? error.message : 'Unknown error';
          serverLogger.error('Async job failed', error instanceof Error ? error : new Error(String(error)), { jobId: job.id });
          await db.query(
            `UPDATE parse_jobs SET status = $1, error = $2, completed_at = NOW() WHERE id = $3`,
            ['failed', jobError, job.id]
          );
        }

        // Deliver webhook if configured
        if (webhookUrl) {
          const payload: WebhookPayload = {
            jobId: job.id,
            status: finalStatus,
            completedAt: new Date().toISOString(),
          };
          if (finalStatus === 'completed') {
            payload.result = jobResult;
          } else {
            payload.error = jobError;
          }

          const delivered = await deliverWebhook(webhookUrl, payload);
          const webhookStatus = delivered ? 'delivered' : 'failed';
          await db.query(
            `UPDATE parse_jobs SET webhook_status = $1 WHERE id = $2`,
            [webhookStatus, job.id]
          );
        }
      },
    });

    res.status(202).json({
      jobId: job.id,
      status: 'pending',
      message: 'Job queued for processing',
    });
  } catch (error: unknown) {
    serverLogger.error('Async parse failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @openapi
 * /parse/{jobId}:
 *   get:
 *     summary: 查询异步任务状态
 *     tags: [Parse]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 任务状态
 *       404:
 *         description: 任务不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:jobId', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await db.query('SELECT * FROM parse_jobs WHERE id = $1', [req.params.jobId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = result.rows[0];
    const response: JobResponse = {
      jobId: job.id,
      status: job.status,
      fileName: job.file_name,
      createdAt: job.created_at,
    };

    if (job.status === 'completed') {
      response.result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
      response.processingTime = job.processing_time;
      response.completedAt = job.completed_at;
    } else if (job.status === 'failed') {
      response.error = job.error;
      response.completedAt = job.completed_at;
    }

    res.json(response);
  } catch (error: unknown) {
    serverLogger.error('Failed to fetch job status', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @openapi
 * /parse/batch:
 *   post:
 *     summary: 批量异步解析（最多 20 文件）
 *     tags: [Parse]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       202:
 *         description: 批量任务已入队
 *       400:
 *         description: 缺少文件或超过 20 个限制
 *       401:
 *         description: 未授权
 *       429:
 *         description: 请求频率超限
 *       500:
 *         description: 服务器错误
 */
router.post('/batch', async (req: AuthenticatedRequest, res) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded. Use multipart/form-data with field name "files"' });
    }

    if (files.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 files per batch' });
    }

    const jobIds: string[] = [];

    for (const f of files) {
      const jobResult = await db.query(
        `INSERT INTO parse_jobs (tenant_id, api_key_id, file_name, file_size, mime_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.tenantId || null, req.apiKeyId || null, f.originalname, f.size, f.mimetype]
      );

      const job = jobResult.rows[0];
      jobIds.push(job.id);

      const fileBuffer = f.buffer;
      const fileName = f.originalname;
      const fileSize = f.size;
      const mimeType = f.mimetype;

      jobQueue.enqueue({
        id: job.id,
        status: 'pending',
        execute: async () => {
          await db.query('UPDATE parse_jobs SET status = $1, started_at = NOW() WHERE id = $2', ['processing', job.id]);

          const file: ServerFileInput = { buffer: fileBuffer, name: fileName, size: fileSize, mimeType };
          const startTime = Date.now();

          try {
            const result = await processResume(file);
            await db.query(
              `UPDATE parse_jobs SET status = $1, result = $2, file_hash = $3, processing_time = $4, completed_at = NOW() WHERE id = $5`,
              ['completed', JSON.stringify(result.resume), result.hash, Date.now() - startTime, job.id]
            );
          } catch (error) {
            serverLogger.error('Batch job failed', error instanceof Error ? error : new Error(String(error)), { jobId: job.id });
            await db.query(
              `UPDATE parse_jobs SET status = $1, error = $2, completed_at = NOW() WHERE id = $3`,
              ['failed', error instanceof Error ? error.message : 'Unknown error', job.id]
            );
          }
        },
      });
    }

    res.status(202).json({
      jobIds,
      totalFiles: files.length,
      message: `${files.length} files queued for processing`,
    });
  } catch (error: unknown) {
    serverLogger.error('Batch parse failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @openapi
 * /parse/prefetch:
 *   post:
 *     summary: 缓存预热，检查并排队未缓存的 hash
 *     tags: [Parse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hashes]
 *             properties:
 *               hashes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 预热结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 queued:
 *                   type: number
 *                 alreadyCached:
 *                   type: number
 *       400:
 *         description: hashes 参数无效
 */
router.post('/prefetch', async (req, res) => {
  try {
    const { hashes } = req.body;

    if (!Array.isArray(hashes) || hashes.length === 0) {
      return res.status(400).json({ error: 'hashes must be a non-empty array' });
    }

    // Query parse_cache for already-cached hashes
    const placeholders = hashes.map((_: string, i: number) => `$${i + 1}`).join(', ');
    const cacheResult = await db.query(
      `SELECT file_hash FROM parse_cache WHERE file_hash IN (${placeholders})`,
      hashes
    );

    const cachedSet = new Set(cacheResult.rows.map((r: { file_hash: string }) => r.file_hash));
    const uncached = hashes.filter((h: string) => !cachedSet.has(h));

    res.json({
      uncached: uncached.length,
      alreadyCached: cachedSet.size,
    });
  } catch (error: unknown) {
    serverLogger.error('Prefetch failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
