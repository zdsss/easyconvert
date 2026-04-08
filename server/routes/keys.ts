import { Router } from 'express';
import type { AuthenticatedRequest } from '../types';
import * as keyService from '../services/keyService';

const router = Router();

router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, tenantId, scopes, rateLimit, expiresAt } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const key = await keyService.createKey({ name, tenantId, scopes, rateLimit, expiresAt });
    res.status(201).json(key);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const rawTenantId = (req.query.tenantId as string) || req.tenantId || 'default';
    const keys = await keyService.listKeys(rawTenantId);
    res.json(keys);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const key = await keyService.deactivateKey(req.params.id);
    if (!key) return res.status(404).json({ error: 'API key not found' });
    res.json({ message: 'API key deactivated', key });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
