import { Router } from 'express';
import pool from '../db';

const router = Router();

// 生成报告
router.post('/', async (req, res) => {
  try {
    const { taskId, type } = req.body;

    // 获取任务和结果数据
    const task = await pool.query('SELECT * FROM evaluation_tasks WHERE id = $1', [taskId]);
    const results = await pool.query('SELECT * FROM evaluation_results WHERE task_id = $1', [taskId]);

    res.json({
      task: task.rows[0],
      results: results.rows,
      type
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
