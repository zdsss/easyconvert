import { Router, Request, Response } from 'express';
import { serverLogger } from '../lib/logger';
import * as flywheelService from '../services/flywheelService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.75;
    const result = await flywheelService.getCandidates(threshold);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to fetch flywheel candidates', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.post('/promote', async (req: Request, res: Response) => {
  try {
    const { candidateId, evaluationTaskId } = req.body;
    if (!candidateId || !evaluationTaskId) {
      return res.status(400).json({ error: 'candidateId and evaluationTaskId are required' });
    }
    const result = await flywheelService.promote(candidateId, evaluationTaskId);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to promote candidate', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await flywheelService.getStats();
    res.json(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    serverLogger.error('Failed to fetch flywheel stats', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: message });
  }
});

export default router;
