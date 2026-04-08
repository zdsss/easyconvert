import { Router } from 'express';
import * as flywheelService from '../services/flywheelService';
import { asyncHandler } from '../lib/asyncHandler';
import { validateBody, promoteSchema, parseQueryNumber } from '../lib/validate';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const threshold = parseQueryNumber(req.query.threshold, 0.75, 0, 1);
  const result = await flywheelService.getCandidates(threshold);
  res.json(result);
}));

router.post('/promote', validateBody(promoteSchema), asyncHandler(async (req, res) => {
  const result = await flywheelService.promote(req.body.candidateId, req.body.evaluationTaskId);
  res.json(result);
}));

router.get('/stats', asyncHandler(async (_req, res) => {
  const stats = await flywheelService.getStats();
  res.json(stats);
}));

export default router;
