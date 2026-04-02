import { Router } from 'express';
import pool from '../db';

const router = Router();

// 创建评测任务
router.post('/', async (req, res) => {
  try {
    const { name, description, type, config } = req.body;
    const result = await pool.query(
      `INSERT INTO evaluation_tasks (name, description, type, status, config, stats)
       VALUES ($1, $2, $3, 'pending', $4, '{"totalFiles":0,"processedFiles":0,"successCount":0,"failureCount":0}')
       RETURNING *`,
      [name, description, type, JSON.stringify(config)]
    );
    res.json(result.rows[0]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create evaluation:', error);
    res.status(500).json({ error: message });
  }
});

// 获取评测列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = 'SELECT * FROM evaluation_tasks';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch tasks:', error);
    res.status(500).json({ error: message });
  }
});

// 获取评测详情
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM evaluation_tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to get task:', error);
    res.status(500).json({ error: message });
  }
});

// 更新评测任务
router.put('/:id', async (req, res) => {
  try {
    const { status, stats } = req.body;
    const result = await pool.query(
      'UPDATE evaluation_tasks SET status = $1, stats = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [status, JSON.stringify(stats), req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to update task:', error);
    res.status(500).json({ error: message });
  }
});

// 获取评测结果
router.get('/:id/results', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM evaluation_results WHERE task_id = $1', [req.params.id]);
    res.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to get results:', error);
    res.status(500).json({ error: message });
  }
});

// 保存评测结果
router.post('/:id/results', async (req, res) => {
  try {
    const { fileName, fileHash, parsedResume, classification, processTrace, metrics, processingTime, fromCache } = req.body;
    const result = await pool.query(
      `INSERT INTO evaluation_results (task_id, file_name, file_hash, parsed_resume, classification, process_trace, metrics, processing_time, from_cache)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.params.id, fileName, fileHash, JSON.stringify(parsedResume), JSON.stringify(classification), JSON.stringify(processTrace), JSON.stringify(metrics), processingTime, fromCache]
    );
    res.json(result.rows[0]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to save result:', error);
    res.status(500).json({ error: message });
  }
});

export default router;
