import { Router } from 'express';
import pool from '../db';

const router = Router();

// 上传标注数据
router.post('/:taskId/annotations', async (req, res) => {
  try {
    const { resultId, annotation } = req.body;
    const result = await pool.query(
      'UPDATE evaluation_results SET annotation = $1 WHERE id = $2 AND task_id = $3 RETURNING *',
      [JSON.stringify(annotation), resultId, req.params.taskId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量上传标注
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
    res.status(500).json({ error: error.message });
  }
});

export default router;
