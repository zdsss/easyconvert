import { createHash } from 'crypto';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import db from '../db';

// 内部路由前缀 — 跳过认证
const INTERNAL_PREFIXES = ['/api/evaluations', '/api/annotations', '/api/reports'];

// Tenant quota cache (5-minute TTL)
const quotaCache = new Map<string, { quota: number; expiresAt: number }>();
const QUOTA_CACHE_TTL = 5 * 60 * 1000;

async function getTenantQuota(tenantId: string): Promise<number> {
  const cached = quotaCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.quota;

  try {
    const result = await db.query(
      'SELECT quota_per_minute FROM tenants WHERE id = $1',
      [tenantId]
    );
    const quota = (result.rows[0]?.quota_per_minute as number) || 100;
    quotaCache.set(tenantId, { quota, expiresAt: Date.now() + QUOTA_CACHE_TTL });
    return quota;
  } catch {
    return 100; // fallback
  }
}

/**
 * API Key 认证中间件
 * Authorization: Bearer <key> → SHA-256 hash → 查 api_keys 表
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 内部路由跳过认证
  if (INTERNAL_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const apiKey = authHeader.slice(7);
  const keyHash = createHash('sha256').update(apiKey).digest('hex');

  try {
    const result = await db.query(
      'SELECT id, tenant_id, scopes, rate_limit, is_active, expires_at FROM api_keys WHERE key_hash = $1',
      [keyHash]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const key = result.rows[0];

    if (!key.is_active) {
      res.status(401).json({ error: 'API key is deactivated' });
      return;
    }

    if (key.expires_at && new Date(key.expires_at as string) < new Date()) {
      res.status(401).json({ error: 'API key has expired' });
      return;
    }

    // 注入认证信息
    req.tenantId = key.tenant_id as string;
    req.apiKeyId = key.id as string;
    req.scopes = key.scopes as string[];
    req.quotaPerMinute = await getTenantQuota(key.tenant_id as string);

    // 更新 last_used_at（异步，不阻塞请求）
    db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [key.id]).catch(() => {});

    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication service error' });
  }
}
