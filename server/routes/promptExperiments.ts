import { Router } from 'express';
import db from '../db';
import { serverLogger } from '../lib/logger';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM prompt_experiments ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to list prompt experiments', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM prompt_experiments WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    res.json(result.rows[0]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to get prompt experiment', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { taskIds, weakFields, suggestion } = req.body;
    const result = await db.query(
      `INSERT INTO prompt_experiments (task_ids, weak_fields, suggestion)
       VALUES ($1, $2, $3) RETURNING *`,
      [JSON.stringify(taskIds || []), JSON.stringify(weakFields || []), suggestion || '']
    );
    res.json(result.rows[0]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to create prompt experiment', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.put('/:id', async (req, res) => {
  try {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to update prompt experiment', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM prompt_experiments WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to delete prompt experiment', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

export default router;
