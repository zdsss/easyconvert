import { Router } from 'express';
import { parseService } from '../services/parseService';
import type { AuthenticatedRequest } from '../types';
import type { ServerFileInput } from '../lib/types';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

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
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with field name "file"' });
  }

  const file: ServerFileInput = {
    buffer: req.file.buffer,
    name: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  };

  const result = await parseService.syncParse(file);

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
}));

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
router.post('/async', asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file: ServerFileInput = {
    buffer: req.file.buffer,
    name: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  };

  const job = await parseService.asyncParse(file, req.tenantId, req.apiKeyId, req.body?.webhookUrl);

  res.status(202).json({
    jobId: job.id,
    status: 'pending',
    message: 'Job queued for processing',
  });
}));

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
router.get('/:jobId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const response = await parseService.getJobStatus(req.params.jobId);
  if (!response) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(response);
}));

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
router.post('/batch', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded. Use multipart/form-data with field name "files"' });
  }

  if (files.length > 20) {
    return res.status(400).json({ error: 'Maximum 20 files per batch' });
  }

  const jobIds = await parseService.batchParse(files, req.tenantId, req.apiKeyId);

  res.status(202).json({
    jobIds,
    totalFiles: files.length,
    message: `${files.length} files queued for processing`,
  });
}));

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
 *       400:
 *         description: hashes 参数无效
 */
router.post('/prefetch', asyncHandler(async (req, res) => {
  const { hashes } = req.body;

  if (!Array.isArray(hashes) || hashes.length === 0) {
    return res.status(400).json({ error: 'hashes must be a non-empty array' });
  }

  const result = await parseService.checkCachedHashes(hashes);
  res.json(result);
}));

export default router;
