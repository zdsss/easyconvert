import { Kysely, PostgresDialect, SqliteDialect, sql } from 'kysely';
import type { DB } from './schema';

export type { DB };
export { sql };

let _kysely: Kysely<DB>;

export function getKysely(): Kysely<DB> {
  if (_kysely) return _kysely;

  const DATABASE_URL = process.env.DATABASE_URL
    || (process.env.DB_HOST
      ? `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'easyconvert'}`
      : undefined);

  if (DATABASE_URL) {
    // Dynamic require to avoid bundling pg in frontend
    const { Pool } = require('pg');
    _kysely = new Kysely<DB>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: DATABASE_URL }) }),
    });
    console.log('✓ Kysely: using PostgreSQL');
  } else {
    const BetterSqlite3 = require('better-sqlite3');
    const sqliteDb = new BetterSqlite3(':memory:');
    sqliteDb.pragma('foreign_keys = ON');

    _kysely = new Kysely<DB>({
      dialect: new SqliteDialect({ database: sqliteDb }),
    });
    console.log('⚠ Kysely: using SQLite in-memory');

    // Run inline migrations for SQLite
    initSqliteTables(sqliteDb);
  }

  return _kysely;
}

/** Create SQLite tables (equivalent to PG migrations) */
function initSqliteTables(sqliteDb: import('better-sqlite3').Database) {
  const migrations = [
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

  for (const m of migrations) {
    sqliteDb.exec(m);
  }
}
