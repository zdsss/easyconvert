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
    // Reuse the same SQLite instance that sqlite.ts already created & migrated
    const { rawSqliteDb } = require('./sqlite');
    _kysely = new Kysely<DB>({
      dialect: new SqliteDialect({ database: rawSqliteDb }),
    });
    console.log('⚠ Kysely: using SQLite in-memory (shared instance)');
  }

  return _kysely;
}
