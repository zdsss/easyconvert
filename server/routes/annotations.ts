import { Router } from 'express';
import pool from '../db';
import { serverLogger } from '../lib/logger';

const router = Router();

/**
 * @openapi
 * /evaluations/{taskId}/annotations:
 *   post:
 *     summary: 上传单条标注数据
 *     tags: [Annotations]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resultId, annotation]
 *             properties:
 *               resultId:
 *                 type: string
 *               annotation:
 *                 type: object
 *     responses:
 *       200:
 *         description: 标注保存成功
 *       500:
 *         description: 服务器错误
 */
router.post('/:taskId/annotations', async (req, res) => {
  try {
    const { resultId, annotation } = req.body;
    const result = await pool.query(
      'UPDATE evaluation_results SET annotation = $1 WHERE id = $2 AND task_id = $3 RETURNING *',
      [JSON.stringify(annotation), resultId, req.params.taskId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    serverLogger.error('Failed to save annotation', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @openapi
 * /evaluations/{taskId}/annotations/batch:
 *   post:
 *     summary: 批量上传标注数据
 *     tags: [Annotations]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [annotations]
 *             properties:
 *               annotations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     resultId:
 *                       type: string
 *                     annotation:
 *                       type: object
 *     responses:
 *       200:
 *         description: 批量标注保存成功
 *       500:
 *         description: 服务器错误
 */
router.post('/:taskId/annotations/batch', async (req, res) => {
  try {
    const { annotations } = req.body;
    const results = [];

    for (const { resultId, annotation } of annotations) {
      const result = await pool.query(
        'UPDATE evaluation_results SET annotation = $1 WHERE id = $2 AND task_id = $3 RETURNING *',
        [JSON.stringify(annotation), resultId, req.params.taskId]
      );
      results.push(result.rows[0]);
    }

    res.json(results);
  } catch (error) {
    serverLogger.error('Failed to save batch annotations', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
