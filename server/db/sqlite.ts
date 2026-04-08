/**
 * SQLite in-memory fallback — replaces the old hand-rolled memory.ts
 *
 * Uses sql.js (pure WASM SQLite, no native deps) in :memory: mode.
 * Runs adapted PG migrations at init, then exposes the same
 * `{ query(sql, params?) → { rows, rowCount } }` interface that the
 * rest of the server expects (matching the pg Pool.query shape).
 */
import initSqlJs, { type Database } from 'sql.js';
import { randomUUID } from 'crypto';

let db: Database;
let dbReady: Promise<void>;

// ---------------------------------------------------------------------------
// Migrations (PG → SQLite adapted)
// ---------------------------------------------------------------------------

const MIGRATIONS: string[] = [
  // 001_initial_schema
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
  `CREATE INDEX IF NOT EXISTS idx_evaluation_results_task_id ON evaluation_results(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_results_file_hash ON evaluation_results(file_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_tasks_status ON evaluation_tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_tasks_created_at ON evaluation_tasks(created_at DESC)`,

  // 002_tenants
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
  `CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active)`,

  // 003_api_keys
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
  `CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active)`,

  // 004_parse_jobs
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
  `CREATE INDEX IF NOT EXISTS idx_parse_jobs_tenant_id ON parse_jobs(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_parse_jobs_status ON parse_jobs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_parse_jobs_created_at ON parse_jobs(created_at DESC)`,

  // 005_parse_cache
  `CREATE TABLE IF NOT EXISTS parse_cache (
    hash TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '2.0',
    tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_parse_cache_updated_at ON parse_cache(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_parse_cache_tenant_id ON parse_cache(tenant_id)`,

  // 006_indexes
  `CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_active ON api_keys(tenant_id, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_parse_jobs_tenant_status ON parse_jobs(tenant_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_results_file_name ON evaluation_results(file_name)`,

  // 007_prompt_experiments
  `CREATE TABLE IF NOT EXISTS prompt_experiments (
    id TEXT PRIMARY KEY,
    task_ids TEXT NOT NULL DEFAULT '[]',
    weak_fields TEXT NOT NULL DEFAULT '[]',
    suggestion TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // 008_flywheel_promotions
  `CREATE TABLE IF NOT EXISTS flywheel_promotions (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    evaluation_task_id TEXT NOT NULL,
    promoted_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_flywheel_promotions_candidate ON flywheel_promotions(candidate_id)`,

  // schema_migrations tracker
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    executed_at TEXT DEFAULT (datetime('now'))
  )`,
];

// ---------------------------------------------------------------------------
// Init: load WASM + run migrations
// ---------------------------------------------------------------------------

dbReady = (async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  for (const sql of MIGRATIONS) {
    db.run(sql);
  }
})();

// ---------------------------------------------------------------------------
// SQL rewriting: PG → SQLite
// ---------------------------------------------------------------------------

function rewritePlaceholders(sql: string): string {
  let idx = 0;
  return sql.replace(/\$\d+/g, () => { idx++; return `?${idx}`; });
}

function rewriteSql(sql: string): string {
  let s = sql;
  s = s.replace(/\bNOW\(\)/gi, "datetime('now')");
  s = s.replace(/\bILIKE\b/gi, 'LIKE');
  s = s.replace(/(\w+)->>'\s*(\w+)\s*'/g, "json_extract($1, '$$.$2')");
  s = s.replace(
    /datetime\('now'\)\s*-\s*INTERVAL\s+'1 day'\s*\*\s*\?\d*/gi,
    "datetime('now', '-' || ?1 || ' days')"
  );
  s = s.replace(
    /datetime\('now'\)\s*-\s*INTERVAL\s+'(\d+)\s+days?'/gi,
    (_m, n) => `datetime('now', '-${n} days')`
  );
  s = s.replace(
    /datetime\('now'\)\s*-\s*INTERVAL\s+'1 minute'/gi,
    "datetime('now', '-1 minutes')"
  );
  s = s.replace(
    /COUNT\(\*\)\s+FILTER\s*\(\s*WHERE\s+(.+?)\)/gi,
    'SUM(CASE WHEN $1 THEN 1 ELSE 0 END)'
  );
  s = s.replace(
    /AVG\((\w+)\)\s+FILTER\s*\(\s*WHERE\s+(.+?)\)/gi,
    'AVG(CASE WHEN $2 THEN $1 ELSE NULL END)'
  );
  s = s.replace(/::int\b/gi, '');
  s = s.replace(/ARRAY\[([^\]]+)\]/gi, (_m, inner) => {
    const items = inner.split(',').map((i: string) => i.trim());
    return `'${JSON.stringify(items.map((i: string) => i.replace(/'/g, '')))}'`;
  });
  s = s.replace(/\bTRUE\b/gi, '1');
  s = s.replace(/\bFALSE\b/gi, '0');
  s = rewritePlaceholders(s);
  return s;
}

// ---------------------------------------------------------------------------
// JSON column handling
// ---------------------------------------------------------------------------

const JSON_COLUMNS = new Set([
  'config', 'stats', 'parsed_resume', 'annotation', 'classification',
  'process_trace', 'metrics', 'result', 'data', 'task_ids', 'weak_fields',
  'scopes',
]);

function hydrateRow(columns: string[], values: unknown[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    const key = columns[i];
    const value = values[i];
    if (JSON_COLUMNS.has(key) && typeof value === 'string') {
      try { out[key] = JSON.parse(value); } catch { out[key] = value; }
    } else if (key === 'is_active' || key === 'from_cache') {
      out[key] = value === 1 || value === true;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function serializeParam(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === true) return 1;
  if (value === false) return 0;
  if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Buffer))) {
    return JSON.stringify(value);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Public interface — matches pg Pool.query()
// ---------------------------------------------------------------------------

export const sqliteDb = {
  async query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    await dbReady;

    const serializedParams = (params || []).map(serializeParam);

    // Handle RETURNING clause — strip it and do a follow-up SELECT
    const returningMatch = text.match(/\bRETURNING\s+.*/i);
    const hasReturning = !!returningMatch;
    let sqlClean = hasReturning ? text.replace(/\bRETURNING\s+.*/i, '').trim() : text;
    sqlClean = sqlClean.replace(/;\s*$/, '');

    const rewritten = rewriteSql(sqlClean);
    const trimmed = rewritten.trimStart().toUpperCase();

    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const stmt = db.prepare(rewritten);
      stmt.bind(serializedParams);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) {
        const columns = stmt.getColumnNames();
        rows.push(hydrateRow(columns, stmt.get()));
      }
      stmt.free();
      return { rows, rowCount: rows.length };
    }

    if (trimmed.startsWith('INSERT')) {
      // Generate UUID for id column if not provided
      const tableMatch = rewritten.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
      const table = tableMatch?.[1];

      // Check if this INSERT has an id value — if not, generate one
      let finalParams = [...serializedParams];
      let finalSql = rewritten;
      if (table && !rewritten.toLowerCase().includes('(id') && !rewritten.toLowerCase().includes('( id')) {
        // id not in column list — add it
        const colMatch = finalSql.match(/\(([^)]+)\)\s*VALUES/i);
        if (colMatch) {
          const newCols = `(id, ${colMatch[1]})`;
          finalSql = finalSql.replace(colMatch[0], `${newCols} VALUES`);
          const valMatch = finalSql.match(/VALUES\s*\(([^)]+)\)/i);
          if (valMatch) {
            finalSql = finalSql.replace(valMatch[0], `VALUES (?${finalParams.length + 1}, ${valMatch[1]})`);
            finalParams.push(randomUUID());
          }
        }
      } else {
        // id is in column list — check if the value is null/missing
        const colMatch = finalSql.match(/\(([^)]+)\)\s*VALUES/i);
        if (colMatch) {
          const cols = colMatch[1].split(',').map(c => c.trim().toLowerCase());
          const idIdx = cols.indexOf('id');
          if (idIdx >= 0 && (finalParams[idIdx] === null || finalParams[idIdx] === undefined)) {
            finalParams[idIdx] = randomUUID();
          }
        }
      }

      db.run(finalSql, finalParams);
      const changes = db.getRowsModified();

      if (hasReturning && table) {
        const lastId = finalParams[0]; // id is always first after our injection
        const selectStmt = db.prepare(`SELECT * FROM ${table} WHERE rowid = last_insert_rowid()`);
        const rows: Record<string, unknown>[] = [];
        while (selectStmt.step()) {
          rows.push(hydrateRow(selectStmt.getColumnNames(), selectStmt.get()));
        }
        selectStmt.free();
        if (rows.length > 0) return { rows, rowCount: 1 };
      }
      return { rows: [], rowCount: changes };
    }

    if (trimmed.startsWith('UPDATE')) {
      if (hasReturning) {
        const tableMatch = rewritten.match(/UPDATE\s+(\w+)\s+SET/i);
        const table = tableMatch?.[1];
        const whereMatch = rewritten.match(/\bWHERE\s+(.+)$/i);

        if (table && whereMatch) {
          const setClause = rewritten.substring(0, rewritten.search(/\bWHERE\b/i));
          const setParamCount = (setClause.match(/\?\d+/g) || []).length;
          const whereParams = serializedParams.slice(setParamCount);

          // Get IDs before update
          const idStmt = db.prepare(`SELECT id FROM ${table} WHERE ${rewriteSql(whereMatch[1])}`);
          idStmt.bind(whereParams);
          const ids: string[] = [];
          while (idStmt.step()) { ids.push(idStmt.get()[0] as string); }
          idStmt.free();

          db.run(rewritten, serializedParams);
          const changes = db.getRowsModified();

          if (ids.length > 0) {
            const placeholders = ids.map((_, i) => `?${i + 1}`).join(', ');
            const fetchStmt = db.prepare(`SELECT * FROM ${table} WHERE id IN (${placeholders})`);
            fetchStmt.bind(ids);
            const rows: Record<string, unknown>[] = [];
            while (fetchStmt.step()) { rows.push(hydrateRow(fetchStmt.getColumnNames(), fetchStmt.get())); }
            fetchStmt.free();
            return { rows, rowCount: changes };
          }
        }
      }

      db.run(rewritten, serializedParams);
      return { rows: [], rowCount: db.getRowsModified() };
    }

    if (trimmed.startsWith('DELETE')) {
      if (hasReturning) {
        const tableMatch = rewritten.match(/DELETE\s+FROM\s+(\w+)/i);
        const table = tableMatch?.[1];
        const whereMatch = rewritten.match(/\bWHERE\s+(.+)$/i);

        if (table && whereMatch) {
          const fetchStmt = db.prepare(`SELECT * FROM ${table} WHERE ${rewriteSql(whereMatch[1])}`);
          fetchStmt.bind(serializedParams);
          const rows: Record<string, unknown>[] = [];
          while (fetchStmt.step()) { rows.push(hydrateRow(fetchStmt.getColumnNames(), fetchStmt.get())); }
          fetchStmt.free();

          db.run(rewritten, serializedParams);
          return { rows, rowCount: db.getRowsModified() };
        }
      }

      db.run(rewritten, serializedParams);
      return { rows: [], rowCount: db.getRowsModified() };
    }

    // DDL / other
    try {
      db.run(rewritten);
    } catch {
      // Silently ignore DDL failures for migration compat
    }
    return { rows: [], rowCount: 0 };
  },
};
