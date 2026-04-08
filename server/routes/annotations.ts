import { Router } from 'express';
import db from '../db';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.post('/:taskId/annotations', asyncHandler(async (req, res) => {
  const { resultId, annotation } = req.body;
  const result = await db.query(
    'UPDATE evaluation_results SET annotation = $1 WHERE id = $2 AND task_id = $3 RETURNING *',
    [JSON.stringify(annotation), resultId, req.params.taskId]
  );
  res.json(result.rows[0]);
}));

router.post('/:taskId/annotations/batch', asyncHandler(async (req, res) => {
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
}));

export default router;
