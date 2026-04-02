import { Pool } from 'pg';
import { memoryDb } from './memory';

const DATABASE_URL = process.env.DATABASE_URL;

let db: any;

if (DATABASE_URL) {
  const pool = new Pool({ connectionString: DATABASE_URL });

  db = {
    query: (text: string, params?: any[]) => pool.query(text, params),
  };

  console.log('✓ Using PostgreSQL database');
} else {
  console.warn('⚠ DATABASE_URL not set, using in-memory storage');
  db = memoryDb;
}

export default db;
