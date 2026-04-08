import { Router } from 'express';
import {
  generateServerReport,
  getAccuracyTrends,
  getDistribution,
  getErrorPatterns,
  getCostReport,
} from '../lib/reportGenerator';

const router = Router();

/**
 * @openapi
 * /reports:
 *   post:
 *     summary: 生成完整评测报告
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId]
 *             properties:
 *               taskId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 报告生成成功
 *       400:
 *         description: 缺少 taskId
 *       500:
 *         description: 服务器错误
 */
router.post('/', async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const report = await generateServerReport(taskId);
    res.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * @openapi
 * /reports/trends:
 *   get:
 *     summary: 跨任务准确率趋势
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: 趋势数据
 *       500:
 *         description: 服务器错误
 */
router.get('/trends', async (_req, res) => {
  try {
    const trends = await getAccuracyTrends();
    res.json(trends);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * @openapi
 * /reports/distribution/{taskId}:
 *   get:
 *     summary: 获取任务分类分布
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 分布数据
 *       500:
 *         description: 服务器错误
 */
router.get('/distribution/:taskId', async (req, res) => {
  try {
    const distribution = await getDistribution(req.params.taskId);
    res.json(distribution);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * @openapi
 * /reports/errors/{taskId}:
 *   get:
 *     summary: 获取错误模式分析
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 错误模式数据
 *       500:
 *         description: 服务器错误
 */
router.get('/errors/:taskId', async (req, res) => {
  try {
    const errors = await getErrorPatterns(req.params.taskId);
    res.json(errors);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * @openapi
 * /reports/cost/{taskId}:
 *   get:
 *     summary: 获取成本追踪报告
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成本数据
 *       500:
 *         description: 服务器错误
 */
router.get('/cost/:taskId', async (req, res) => {
  try {
    const cost = await getCostReport(req.params.taskId);
    res.json(cost);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
