import { Router } from 'express';
import type { AuthenticatedRequest } from '../types';
import * as keyService from '../services/keyService';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { name, tenantId, scopes, rateLimit, expiresAt } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const key = await keyService.createKey({ name, tenantId, scopes, rateLimit, expiresAt });
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
