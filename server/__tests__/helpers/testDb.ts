/**
 * Test database helper — provides a real SQLite in-memory database
 * for integration-style tests. Supports both db.query() and ky (Kysely).
 *
 * Usage:
 *   import { setupTestDb } from './helpers/testDb';
 *   const { mockDb, mockKy, resetDb } = setupTestDb();
 *   vi.mock('../db', () => ({ default: mockDb, ky: mockKy }));
 */
import BetterSqlite3 from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import type { DB } from '../../db/schema';

const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS evaluation_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    config TEXT NOT NULL,
    stats TEXT NOT NULL DEFAULT '{}',
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS evaluation_results (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES evaluation_tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    parsed_resume TEXT NOT NULL,
    annotation TEXT,
    classification TEXT NOT NULL,
    process_trace TEXT NOT NULL,
    metrics TEXT NOT NULL,
    processing_time INTEGER NOT NULL,
    from_cache INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    config TEXT NOT NULL DEFAULT '{}',
    is_active INTEGER NOT NULL DEFAULT 1,
    quota_per_minute INTEGER DEFAULT 100,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    scopes TEXT NOT NULL DEFAULT '["parse"]',
    rate_limit INTEGER NOT NULL DEFAULT 100,
    is_active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    last_used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS parse_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
    api_key_id TEXT REFERENCES api_keys(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    file_name TEXT NOT NULL,
    file_hash TEXT,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    result TEXT,
    error TEXT,
    processing_time INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    webhook_url TEXT,
    webhook_status TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS parse_cache (
    hash TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '2.0',
    tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS prompt_experiments (
    id TEXT PRIMARY KEY,
    task_ids TEXT NOT NULL DEFAULT '[]',
    weak_fields TEXT NOT NULL DEFAULT '[]',
    suggestion TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS flywheel_promotions (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    evaluation_task_id TEXT NOT NULL,
    promoted_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    executed_at TEXT DEFAULT (datetime('now'))
  )`,
];

export function setupTestDb() {
  const sqliteDb = new BetterSqlite3(':memory:');
  sqliteDb.pragma('foreign_keys = ON');

  for (const m of MIGRATIONS) {
    sqliteDb.exec(m);
  }

  const mockKy = new Kysely<DB>({
    dialect: new SqliteDialect({ database: sqliteDb }),
  });

  // Minimal db.query() wrapper over the same SQLite instance
  const mockDb = {
    async query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
      let sql = text;
      // $1, $2 → ?, ?
      sql = sql.replace(/\$\d+/g, '?');
      // NOW() → datetime('now')
      sql = sql.replace(/\bNOW\(\)/gi, "datetime('now')");
      // Boolean literals
      sql = sql.replace(/\bTRUE\b/gi, '1');
      sql = sql.replace(/\bFALSE\b/gi, '0');

      const hasReturning = /\bRETURNING\s+/i.test(sql);
      let sqlClean = hasReturning ? sql.replace(/\bRETURNING\s+.*/i, '').trim() : sql;
      sqlClean = sqlClean.replace(/;\s*$/, '');

      const serialized = (params || []).map(v => {
        if (v === true) return 1;
        if (v === false) return 0;
        if (Array.isArray(v) || (typeof v === 'object' && v !== null)) return JSON.stringify(v);
        return v ?? null;
      });

      const trimmed = sqlClean.trimStart().toUpperCase();

      if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
        const rows = sqliteDb.prepare(sqlClean).all(...serialized) as T[];
        return { rows, rowCount: rows.length };
      }

      if (trimmed.startsWith('INSERT')) {
        const info = sqliteDb.prepare(sqlClean).run(...serialized);
        if (hasReturning) {
          const table = sqlClean.match(/INSERT\s+INTO\s+(\w+)/i)?.[1];
          if (table) {
            const rows = sqliteDb.prepare(`SELECT * FROM ${table} WHERE rowid = ?`).all(info.lastInsertRowid) as T[];
            return { rows, rowCount: 1 };
          }
        }
        return { rows: [], rowCount: info.changes };
      }

      if (trimmed.startsWith('UPDATE')) {
        const info = sqliteDb.prepare(sqlClean).run(...serialized);
        if (hasReturning) {
          const table = sqlClean.match(/UPDATE\s+(\w+)\s+SET/i)?.[1];
          if (table) {
            const rows = sqliteDb.prepare(`SELECT * FROM ${table} WHERE rowid IN (SELECT rowid FROM ${table} LIMIT ${info.changes})`).all() as T[];
            return { rows, rowCount: info.changes };
          }
        }
        return { rows: [], rowCount: info.changes };
      }

      if (trimmed.startsWith('DELETE')) {
        const info = sqliteDb.prepare(sqlClean).run(...serialized);
        return { rows: [], rowCount: info.changes };
      }

      sqliteDb.exec(sqlClean);
      return { rows: [], rowCount: 0 };
    },
  };

  function resetDb() {
    for (const table of ['flywheel_promotions', 'prompt_experiments', 'parse_cache', 'parse_jobs', 'api_keys', 'tenants', 'evaluation_results', 'evaluation_tasks']) {
      sqliteDb.exec(`DELETE FROM ${table}`);
    }
  }

  function close() {
    mockKy.destroy();
    sqliteDb.close();
  }

  return { mockDb, mockKy, resetDb, close, sqliteDb };
}
