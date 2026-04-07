import { Pool } from 'pg';
import { sqliteDb } from './sqlite';

// 支持 DATABASE_URL 或分开的 DB_* 变量
const DATABASE_URL = process.env.DATABASE_URL
  || (process.env.DB_HOST
    ? `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'easyconvert'}`
    : undefined);

let db: any;

if (DATABASE_URL) {
  const pool = new Pool({ connectionString: DATABASE_URL });

  db = {
    query: (text: string, params?: any[]) => pool.query(text, params),
  };

  console.log('✓ Using PostgreSQL database');
} else {
  console.warn('⚠ DATABASE_URL not set, using SQLite in-memory storage');
  db = sqliteDb;
}

export { runMigrations } from './migrate';
export default db;
