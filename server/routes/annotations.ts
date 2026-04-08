import { Router } from 'express';
import db from '../db';
import { serverLogger } from '../lib/logger';

const router = Router();

router.post('/:taskId/annotations', async (req, res) => {
  try {
    const { resultId, annotation } = req.body;
    const result = await db.query(
      'UPDATE evaluation_results SET annotation = $1 WHERE id = $2 AND task_id = $3 RETURNING *',
      [JSON.stringify(annotation), resultId, req.params.taskId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    serverLogger.error('Failed to save annotation', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.post('/:taskId/annotations/batch', async (req, res) => {
  try {
    const { annotations } = req.body;
    const results = [];

    for (const { resultId, annotation } of annotations) {
      const result = await db.query(
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
