import { Router } from 'express';
import type { AuthenticatedRequest } from '../types';
import * as keyService from '../services/keyService';
import { asyncHandler } from '../lib/asyncHandler';
import { validateBody, createKeySchema } from '../lib/validate';

const router = Router();

router.post('/', validateBody(createKeySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const key = await keyService.createKey(req.body);
  res.status(201).json(key);
}));

router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const rawTenantId = (req.query.tenantId as string) || req.tenantId || 'default';
  const keys = await keyService.listKeys(rawTenantId);
  res.json(keys);
}));

router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const key = await keyService.deactivateKey(req.params.id);
  if (!key) return res.status(404).json({ error: 'API key not found' });
  res.json({ message: 'API key deactivated', key });
}));

export default router;
