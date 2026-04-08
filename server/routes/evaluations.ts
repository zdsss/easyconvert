import { Router } from 'express';
import { serverLogger } from '../lib/logger';
import * as evaluationService from '../services/evaluationService';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const task = await evaluationService.createTask(req.body);
    res.json(task);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to create evaluation', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    const tasks = await evaluationService.listTasks({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status ? String(status) : undefined,
    });
    res.json(tasks);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to fetch tasks', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await evaluationService.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to get task', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const task = await evaluationService.updateTask(req.params.id, req.body);
    res.json(task);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to update task', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.get('/:id/results', async (req, res) => {
  try {
    const results = await evaluationService.getResults(req.params.id);
    res.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to get results', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.post('/:id/retry-failed', async (req, res) => {
  try {
    const retriedCount = await evaluationService.retryFailed(req.params.id);
    res.json({ retriedCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to retry failed results', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.post('/:id/results', async (req, res) => {
  try {
    const result = await evaluationService.saveResult(req.params.id, req.body);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to save result', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

export default router;
