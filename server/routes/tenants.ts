import { Router } from 'express';
import { ky } from '../db';

const router = Router();

// GET /api/tenants — list all tenants with quota info
router.get('/', async (_req, res) => {
  try {
    const tenants = await ky
      .selectFrom('tenants')
      .select(['id', 'name', 'slug', 'created_at', 'quota_per_minute'])
      .orderBy('created_at', 'desc')
      .execute();

    res.json(tenants.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      createdAt: t.created_at,
      quotaPerMinute: t.quota_per_minute ?? 100,
    })));
  } catch {
    res.json([]);
  }
});

// GET /api/tenants/:id — single tenant detail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const t = await ky
      .selectFrom('tenants')
      .select(['id', 'name', 'slug', 'created_at', 'quota_per_minute'])
      .where(eb => eb.or([eb('id', '=', id), eb('slug', '=', id)]))
      .executeTakeFirst();

    if (!t) return res.status(404).json({ error: 'Not found' });

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

    await ky
      .updateTable('tenants')
      .set({ quota_per_minute: quotaPerMinute })
      .where(eb => eb.or([eb('id', '=', id), eb('slug', '=', id)]))
      .execute();

    res.json({ success: true, quotaPerMinute });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
