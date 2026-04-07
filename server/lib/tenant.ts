import db from '../db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 根据 tenantId 参数查找真实 UUID（支持 slug）
 */
export async function resolveTenantId(tenantId: string): Promise<string | null> {
  if (UUID_RE.test(tenantId)) {
    return tenantId;
  }
  try {
    const result = await db.query('SELECT id FROM tenants WHERE slug = $1', [tenantId]);
    return result.rows[0]?.id || null;
  } catch {
    return null;
  }
}
