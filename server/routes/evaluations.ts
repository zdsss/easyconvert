import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { validateBody, createEvaluationSchema, updateEvaluationSchema, saveResultSchema } from '../lib/validate';
import * as evaluationService from '../services/evaluationService';

const router = Router();

router.post('/', validateBody(createEvaluationSchema), asyncHandler(async (req, res) => {
  const task = await evaluationService.createTask(req.body);
  res.json(task);
}));

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const tasks = await evaluationService.listTasks({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status ? String(status) : undefined,
  });
  res.json(tasks);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const task = await evaluationService.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
}));

router.put('/:id', validateBody(updateEvaluationSchema), asyncHandler(async (req, res) => {
  const task = await evaluationService.updateTask(req.params.id, req.body);
  res.json(task);
}));

router.get('/:id/results', asyncHandler(async (req, res) => {
  const results = await evaluationService.getResults(req.params.id);
  res.json(results);
}));

router.post('/:id/retry-failed', asyncHandler(async (req, res) => {
  const retriedCount = await evaluationService.retryFailed(req.params.id);
  res.json({ retriedCount });
}));

router.post('/:id/results', validateBody(saveResultSchema), asyncHandler(async (req, res) => {
  const result = await evaluationService.saveResult(req.params.id, req.body);
  res.json(result);
}));

export default router;
