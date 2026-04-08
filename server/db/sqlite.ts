/**
 * SQLite in-memory fallback using better-sqlite3 (native, fast).
 *
 * Exposes the same `{ query(sql, params?) → { rows, rowCount } }` interface
 * that matches the pg Pool.query shape. Handles PG→SQLite SQL differences.
 */
import BetterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'crypto';

const sqliteDb = new BetterSqlite3(':memory:');
sqliteDb.pragma('foreign_keys = ON');
sqliteDb.pragma('journal_mode = WAL');

/** Expose the raw better-sqlite3 instance so Kysely can share it */
export { sqliteDb as rawSqliteDb };

// ---------------------------------------------------------------------------
// Migrations (PG → SQLite adapted)
// ---------------------------------------------------------------------------

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
  `CREATE INDEX IF NOT EXISTS idx_evaluation_results_task_id ON evaluation_results(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_results_file_hash ON evaluation_results(file_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_tasks_status ON evaluation_tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_tasks_created_at ON evaluation_tasks(created_at DESC)`,
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
  `CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_active ON api_keys(tenant_id, is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_parse_jobs_tenant_status ON parse_jobs(tenant_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_evaluation_results_file_name ON evaluation_results(file_name)`,
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
  `CREATE INDEX IF NOT EXISTS idx_flywheel_promotions_candidate ON flywheel_promotions(candidate_id)`,
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    executed_at TEXT DEFAULT (datetime('now'))
  )`,
];

for (const m of MIGRATIONS) {
  sqliteDb.exec(m);
}

// ---------------------------------------------------------------------------
// SQL rewriting: PG → SQLite (simplified)
// ---------------------------------------------------------------------------

function rewriteSql(sql: string): string {
  let s = sql;
  // $1, $2 → ?, ?
  s = s.replace(/\$\d+/g, '?');
  // NOW() → datetime('now')
  s = s.replace(/\bNOW\(\)/gi, "datetime('now')");
  // ILIKE → LIKE
  s = s.replace(/\bILIKE\b/gi, 'LIKE');
  // INTERVAL expressions
  s = s.replace(
    /datetime\('now'\)\s*-\s*INTERVAL\s+'1 day'\s*\*\s*\?/gi,
    "datetime('now', '-' || ? || ' days')"
  );
  s = s.replace(
    /datetime\('now'\)\s*-\s*INTERVAL\s+'(\d+)\s+days?'/gi,
    (_m, n) => `datetime('now', '-${n} days')`
  );
  s = s.replace(
    /datetime\('now'\)\s*-\s*INTERVAL\s+'1 minute'/gi,
    "datetime('now', '-1 minutes')"
  );
  // COUNT(*) FILTER (WHERE ...) → SUM(CASE WHEN ... THEN 1 ELSE 0 END)
  s = s.replace(
    /COUNT\(\*\)\s+FILTER\s*\(\s*WHERE\s+(.+?)\)/gi,
    'SUM(CASE WHEN $1 THEN 1 ELSE 0 END)'
  );
  // AVG(...) FILTER (WHERE ...) → AVG(CASE WHEN ... THEN ... ELSE NULL END)
  s = s.replace(
    /AVG\((\w+)\)\s+FILTER\s*\(\s*WHERE\s+(.+?)\)/gi,
    'AVG(CASE WHEN $2 THEN $1 ELSE NULL END)'
  );
  // Type casts
  s = s.replace(/::int\b/gi, '');
  s = s.replace(/::text\b/gi, '');
  // ARRAY[...] → JSON array string
  s = s.replace(/ARRAY\[([^\]]+)\]/gi, (_m, inner) => {
    const items = inner.split(',').map((i: string) => i.trim().replace(/'/g, ''));
    return `'${JSON.stringify(items)}'`;
  });
  // Boolean literals
  s = s.replace(/\bTRUE\b/gi, '1');
  s = s.replace(/\bFALSE\b/gi, '0');
  // gen_random_uuid() — not needed, we inject UUIDs in JS
  s = s.replace(/\bgen_random_uuid\(\)/gi, '?');
  return s;
}

// ---------------------------------------------------------------------------
// JSON column hydration
// ---------------------------------------------------------------------------

const JSON_COLUMNS = new Set([
  'config', 'stats', 'parsed_resume', 'annotation', 'classification',
  'process_trace', 'metrics', 'result', 'data', 'task_ids', 'weak_fields',
  'scopes',
]);

function hydrateRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
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

export const betterSqliteDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<T = Record<string, any>>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
    const serializedParams = (params || []).map(serializeParam);

    // Handle RETURNING clause
    const hasReturning = /\bRETURNING\s+/i.test(text);
    let sqlClean = hasReturning ? text.replace(/\bRETURNING\s+.*/i, '').trim() : text;
    sqlClean = sqlClean.replace(/;\s*$/, '');

    const rewritten = rewriteSql(sqlClean);
    const trimmed = rewritten.trimStart().toUpperCase();

    // SELECT / WITH
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const rows = sqliteDb.prepare(rewritten).all(...serializedParams) as Record<string, unknown>[];
      return { rows: rows.map(hydrateRow) as T[], rowCount: rows.length };
    }

    // INSERT
    if (trimmed.startsWith('INSERT')) {
      const tableMatch = rewritten.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
      const table = tableMatch?.[1];

      let finalParams = [...serializedParams];
      let finalSql = rewritten;

      // Inject UUID for id column if not provided
      if (table) {
        const colMatch = finalSql.match(/\(([^)]+)\)\s*VALUES/i);
        if (colMatch) {
          const cols = colMatch[1].split(',').map(c => c.trim().toLowerCase());
          const idIdx = cols.indexOf('id');
          if (idIdx === -1) {
            // id not in column list — add it
            finalSql = finalSql.replace(colMatch[0], `(id, ${colMatch[1]}) VALUES`);
            const valMatch = finalSql.match(/VALUES\s*\(([^)]+)\)/i);
            if (valMatch) {
              finalSql = finalSql.replace(valMatch[0], `VALUES (?, ${valMatch[1]})`);
              finalParams = [randomUUID(), ...finalParams];
            }
          } else if (finalParams[idIdx] === null || finalParams[idIdx] === undefined) {
            finalParams[idIdx] = randomUUID();
          }
        }
      }

      // Handle gen_random_uuid() placeholder
      const uuidPlaceholderCount = (text.match(/gen_random_uuid\(\)/gi) || []).length;
      if (uuidPlaceholderCount > 0) {
        // Each gen_random_uuid() was replaced with ?, add UUID params
        const newParams: unknown[] = [];
        let paramIdx = 0;
        for (const char of finalSql) {
          if (char === '?') {
            if (paramIdx < finalParams.length) {
              newParams.push(finalParams[paramIdx]);
            } else {
              newParams.push(randomUUID());
            }
            paramIdx++;
          }
        }
        finalParams = newParams;
      }

      const info = sqliteDb.prepare(finalSql).run(...finalParams);

      if (hasReturning && table) {
        const rows = sqliteDb.prepare(`SELECT * FROM ${table} WHERE rowid = ?`).all(info.lastInsertRowid) as Record<string, unknown>[];
        return { rows: rows.map(hydrateRow) as T[], rowCount: 1 };
      }
      return { rows: [], rowCount: info.changes };
    }

    // UPDATE
    if (trimmed.startsWith('UPDATE')) {
      if (hasReturning) {
        const tableMatch = rewritten.match(/UPDATE\s+(\w+)\s+SET/i);
        const table = tableMatch?.[1];
        const whereMatch = rewritten.match(/\bWHERE\s+(.+)$/i);

        if (table && whereMatch) {
          // Count SET clause params to split params correctly
          const setClause = rewritten.substring(0, rewritten.search(/\bWHERE\b/i));
          const setParamCount = (setClause.match(/\?/g) || []).length;
          const whereParams = serializedParams.slice(setParamCount);

          // Get IDs before update
          const ids = sqliteDb.prepare(
            `SELECT id FROM ${table} WHERE ${rewriteSql(whereMatch[1])}`
          ).all(...whereParams) as { id: string }[];

          const info = sqliteDb.prepare(rewritten).run(...serializedParams);

          if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(', ');
            const rows = sqliteDb.prepare(
              `SELECT * FROM ${table} WHERE id IN (${placeholders})`
            ).all(...ids.map(r => r.id)) as Record<string, unknown>[];
            return { rows: rows.map(hydrateRow) as T[], rowCount: info.changes };
          }
        }
      }

      const info = sqliteDb.prepare(rewritten).run(...serializedParams);
      return { rows: [], rowCount: info.changes };
    }

    // DELETE
    if (trimmed.startsWith('DELETE')) {
      if (hasReturning) {
        const tableMatch = rewritten.match(/DELETE\s+FROM\s+(\w+)/i);
        const table = tableMatch?.[1];
        const whereMatch = rewritten.match(/\bWHERE\s+(.+)$/i);

        if (table && whereMatch) {
          const rows = sqliteDb.prepare(
            `SELECT * FROM ${table} WHERE ${rewriteSql(whereMatch[1])}`
          ).all(...serializedParams) as Record<string, unknown>[];

          sqliteDb.prepare(rewritten).run(...serializedParams);
          return { rows: rows.map(hydrateRow) as T[], rowCount: rows.length };
        }
      }

      const info = sqliteDb.prepare(rewritten).run(...serializedParams);
      return { rows: [], rowCount: info.changes };
    }

    // DDL / other
    try {
      sqliteDb.exec(rewritten);
    } catch {
      // Silently ignore DDL failures for migration compat
    }
    return { rows: [], rowCount: 0 };
  },
};
