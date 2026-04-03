import { Router } from 'express';
import db from '../db';

const router = Router();

// GET /api/tenants — list all tenants with quota info
router.get('/', async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, slug, created_at, quota_per_minute FROM tenants ORDER BY created_at DESC`
    );
    const tenants = (result.rows || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      createdAt: t.created_at,
      quotaPerMinute: t.quota_per_minute ?? 100,
    }));
    res.json(tenants);
  } catch {
    res.json([]);
  }
});

// GET /api/tenants/:id — single tenant detail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, name, slug, created_at, quota_per_minute FROM tenants WHERE id = $1 OR slug = $1`,
      [id]
    );
    if (!result.rows?.length) return res.status(404).json({ error: 'Not found' });
    const t = result.rows[0];
    res.json({
      id: t.id,
      name: t.name,
      slug: t.slug,
      createdAt: t.created_at,
      quotaPerMinute: t.quota_per_minute ?? 100,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tenants/:id/quota — update quota
router.put('/:id/quota', async (req, res) => {
  try {
    const { id } = req.params;
    const { quotaPerMinute } = req.body;
    if (!quotaPerMinute || quotaPerMinute < 1) {
      return res.status(400).json({ error: 'Invalid quota value' });
    }
    await db.query(
      `UPDATE tenants SET quota_per_minute = $1 WHERE id = $2 OR slug = $2`,
      [quotaPerMinute, id]
    );
    res.json({ success: true, quotaPerMinute });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
