import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

interface PromptExperiment {
  id: string;
  taskIds: string[];
  weakFields: string[];
  suggestion: string;
  createdAt: string;
}

const experiments: PromptExperiment[] = [];

// GET / — list all experiments
router.get('/', (_req, res) => {
  res.json(experiments);
});

// POST / — create a new experiment
router.post('/', (req, res) => {
  const { taskIds, weakFields, suggestion } = req.body;
  const experiment: PromptExperiment = {
    id: crypto.randomUUID(),
    taskIds: taskIds || [],
    weakFields: weakFields || [],
    suggestion: suggestion || '',
    createdAt: new Date().toISOString(),
  };
  experiments.push(experiment);
  res.json(experiment);
});

export default router;
