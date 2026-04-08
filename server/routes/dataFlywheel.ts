import { Router, Request, Response } from 'express';
import * as flywheelService from '../services/flywheelService';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const threshold = parseFloat(req.query.threshold as string) || 0.75;
  const result = await flywheelService.getCandidates(threshold);
  res.json(result);
}));

router.post('/promote', asyncHandler(async (req: Request, res: Response) => {
  const { candidateId, evaluationTaskId } = req.body;
  if (!candidateId || !evaluationTaskId) {
    return res.status(400).json({ error: 'candidateId and evaluationTaskId are required' });
  }
  const result = await flywheelService.promote(candidateId, evaluationTaskId);
  res.json(result);
}));

router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await flywheelService.getStats();
  res.json(stats);
}));

export default router;
