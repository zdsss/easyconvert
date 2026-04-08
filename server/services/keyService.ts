import { createHash, randomBytes } from 'crypto';
import db from '../db';
import { resolveTenantId } from '../lib/tenant';

/** Ensure the default tenant exists, return its ID */
export async function ensureDefaultTenant(): Promise<string> {
  const existing = await db.query("SELECT id FROM tenants WHERE slug = 'default'");
  if (existing.rows.length > 0) return existing.rows[0].id as string;

  const result = await db.query(
    "INSERT INTO tenants (name, slug, plan) VALUES ('Default', 'default', 'free') RETURNING id"
  );
  return result.rows[0].id as string;
}

export interface CreateKeyInput {
  name: string;
  tenantId?: string;
  scopes?: string[];
  rateLimit?: number;
  expiresAt?: string;
}

export async function createKey(input: CreateKeyInput) {
  let tenantId: string;
  if (input.tenantId) {
    const resolved = await resolveTenantId(input.tenantId);
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
    [tenantId, input.name, keyPrefix, keyHash, input.scopes || ['parse'], input.rateLimit || 100, input.expiresAt || null]
  );

  return { ...result.rows[0], key: rawKey };
}

export async function listKeys(rawTenantId: string) {
  const tenantId = await resolveTenantId(rawTenantId);
  if (!tenantId) return [];

  const result = await db.query(
    `SELECT id, tenant_id, name, key_prefix, scopes, rate_limit, is_active, expires_at, last_used_at, created_at
     FROM api_keys WHERE tenant_id = $1 AND is_active = TRUE`,
    [tenantId]
  );
  return result.rows;
}

export async function deactivateKey(id: string) {
  const result = await db.query(
    'UPDATE api_keys SET is_active = $1 WHERE id = $2 RETURNING id, name, is_active',
    [false, id]
  );
  return result.rows[0] || null;
}
