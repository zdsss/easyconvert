import { Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import db from '../db';
import type { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * 根据 tenantId 参数查找真实 UUID
 * 支持直接传 UUID 或 slug（如 "default"）
 */
async function resolveTenantId(tenantId: string): Promise<string | null> {
  // 如果是有效 UUID 格式，直接返回
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
    return tenantId;
  }
  // 否则按 slug 查找
  try {
    const result = await db.query('SELECT id FROM tenants WHERE slug = $1', [tenantId]);
    return result.rows[0]?.id || null;
  } catch {
    return null;
  }
}

/**
 * 确保 default 租户存在
 */
async function ensureDefaultTenant(): Promise<string> {
  const existing = await db.query("SELECT id FROM tenants WHERE slug = 'default'");
  if (existing.rows.length > 0) return existing.rows[0].id;

  const result = await db.query(
    "INSERT INTO tenants (name, slug, plan) VALUES ('Default', 'default', 'free') RETURNING id"
  );
  return result.rows[0].id;
}

/**
 * @openapi
 * /keys:
 *   post:
 *     summary: 创建 API Key
 *     tags: [Keys]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               tenantId:
 *                 type: string
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *               rateLimit:
 *                 type: integer
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Key 创建成功，返回明文 key（仅此一次）
 *       400:
 *         description: 缺少 name
 *       500:
 *         description: 服务器错误
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, tenantId: rawTenantId, scopes, rateLimit, expiresAt } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // 解析 tenantId，默认创建 default 租户
    let tenantId: string;
    if (rawTenantId) {
      const resolved = await resolveTenantId(rawTenantId);
      tenantId = resolved || await ensureDefaultTenant();
    } else {
      tenantId = await ensureDefaultTenant();
    }

    const rawKey = `ec_${randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 10);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const result = await db.query(
      `INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, scopes, rate_limit, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, tenant_id, name, key_prefix, scopes, rate_limit, is_active, expires_at, created_at`,
      [tenantId, name, keyPrefix, keyHash, scopes || ['parse'], rateLimit || 100, expiresAt || null]
    );

    res.status(201).json({
      ...result.rows[0],
      key: rawKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * @openapi
 * /keys:
 *   get:
 *     summary: 列出 API Keys
 *     tags: [Keys]
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key 列表
 *       500:
 *         description: 服务器错误
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const rawTenantId = (req.query.tenantId as string) || req.tenantId || 'default';
    const tenantId = await resolveTenantId(rawTenantId);

    if (!tenantId) {
      return res.json([]); // 租户不存在，返回空
    }

    const result = await db.query(
      `SELECT id, tenant_id, name, key_prefix, scopes, rate_limit, is_active, expires_at, last_used_at, created_at
       FROM api_keys WHERE tenant_id = $1 AND is_active = TRUE`,
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * @openapi
 * /keys/{id}:
 *   delete:
 *     summary: 停用 API Key（软删除）
 *     tags: [Keys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key 已停用
 *       404:
 *         description: Key 不存在
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const result = await db.query(
      'UPDATE api_keys SET is_active = $1 WHERE id = $2 RETURNING id, name, is_active',
      [false, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key deactivated', key: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
