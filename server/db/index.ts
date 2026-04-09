import { Pool } from 'pg';
import { betterSqliteDb } from './sqlite';
import { getKysely } from './kysely';
import type { DB } from './schema';
import type { Kysely } from 'kysely';
import { serverLogger } from '../lib/logger';

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface Database {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

// 支持 DATABASE_URL 或分开的 DB_* 变量
const DATABASE_URL = process.env.DATABASE_URL
  || (process.env.DB_HOST
    ? `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'easyconvert'}`
    : undefined);

let db: Database;

if (DATABASE_URL) {
  const pool = new Pool({ connectionString: DATABASE_URL });

  db = {
    query: async (text, params) => {
      const result = await pool.query(text, params);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    },
  };

  serverLogger.info('Using PostgreSQL database');
} else {
  serverLogger.warn('DATABASE_URL not set, using SQLite in-memory storage');
  db = betterSqliteDb;
}

/** Kysely instance — use for new type-safe queries */
export const ky: Kysely<DB> = getKysely();

export { runMigrations } from './migrate';
export default db;
