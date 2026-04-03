import db from '../db';
import { serverLogger } from './logger';
import type { CacheData } from '../../src/lib/types';

const CACHE_TTL_DAYS = 30;
const CACHE_MAX_ENTRIES = 5000;
const VERSION = '2.0';

/**
 * 服务端缓存后端 — PostgreSQL parse_cache 表
 * 开发环境下降级为内存 Map
 */

// 内存降级缓存
const memoryCache = new Map<string, { data: CacheData; timestamp: number; version: string }>();

function isPostgres(): boolean {
  return !!process.env.DATABASE_URL;
}

export async function getCached(hash: string): Promise<CacheData | null> {
  try {
    if (isPostgres()) {
      const result = await db.query(
        'SELECT data, timestamp, version FROM parse_cache WHERE hash = $1',
        [hash]
      );
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      const age = Date.now() - new Date(row.timestamp).getTime();
      const maxAge = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

      if (age > maxAge || row.version !== VERSION) {
        await db.query('DELETE FROM parse_cache WHERE hash = $1', [hash]);
        return null;
      }

      return row.data;
    }

    // 内存降级
    const cached = memoryCache.get(hash);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const maxAge = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

    if (age > maxAge || cached.version !== VERSION) {
      memoryCache.delete(hash);
      return null;
    }

    return cached.data;
  } catch (error) {
    serverLogger.warn('Cache read failed', { error: (error as Error).message });
    return null;
  }
}

export async function setCache(hash: string, data: CacheData): Promise<void> {
  try {
    if (isPostgres()) {
      // Upsert
      await db.query(
        `INSERT INTO parse_cache (hash, data, version, tenant_id)
         VALUES ($1, $2, $3, NULL)
         ON CONFLICT (hash) DO UPDATE SET data = $2, version = $3, updated_at = NOW()`,
        [hash, JSON.stringify(data), VERSION]
      );

      // 清理超限条目
      const countResult = await db.query('SELECT COUNT(*) FROM parse_cache');
      if (parseInt(countResult.rows[0].count) > CACHE_MAX_ENTRIES) {
        await db.query(
          `DELETE FROM parse_cache WHERE hash IN (
            SELECT hash FROM parse_cache ORDER BY updated_at ASC LIMIT $1
          )`,
          [Math.floor(CACHE_MAX_ENTRIES * 0.2)]
        );
      }
      return;
    }

    // 内存降级
    if (memoryCache.size >= CACHE_MAX_ENTRIES) {
      // 删除最旧的 20%
      const entries = [...memoryCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, Math.floor(CACHE_MAX_ENTRIES * 0.2));
      for (const [key] of toDelete) {
        memoryCache.delete(key);
      }
    }

    memoryCache.set(hash, { data, timestamp: Date.now(), version: VERSION });
  } catch (error) {
    serverLogger.warn('Cache write failed', { error: (error as Error).message });
  }
}
