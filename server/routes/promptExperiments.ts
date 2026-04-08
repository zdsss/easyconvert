import { Router } from 'express';
import db from '../db';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const result = await db.query(
    'SELECT * FROM prompt_experiments ORDER BY created_at DESC'
  );
  res.json(result.rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const result = await db.query(
    'SELECT * FROM prompt_experiments WHERE id = $1',
    [req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Experiment not found' });
  }
  res.json(result.rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { taskIds, weakFields, suggestion } = req.body;
  const result = await db.query(
    `INSERT INTO prompt_experiments (task_ids, weak_fields, suggestion)
     VALUES ($1, $2, $3) RETURNING *`,
    [JSON.stringify(taskIds || []), JSON.stringify(weakFields || []), suggestion || '']
  );
  res.json(result.rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { taskIds, weakFields, suggestion, status } = req.body;
  const result = await db.query(
    `UPDATE prompt_experiments
     SET task_ids = COALESCE($1, task_ids),
         weak_fields = COALESCE($2, weak_fields),
         suggestion = COALESCE($3, suggestion),
         status = COALESCE($4, status)
     WHERE id = $5 RETURNING *`,
    [
      taskIds !== undefined ? JSON.stringify(taskIds) : null,
      weakFields !== undefined ? JSON.stringify(weakFields) : null,
      suggestion !== undefined ? suggestion : null,
      status !== undefined ? status : null,
      req.params.id,
    ]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Experiment not found' });
  }
  res.json(result.rows[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db.query(
    'DELETE FROM prompt_experiments WHERE id = $1 RETURNING *',
    [req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Experiment not found' });
  }
  res.json({ message: 'Deleted', id: req.params.id });
}));

export default router;
