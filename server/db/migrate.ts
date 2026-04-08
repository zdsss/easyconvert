import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * 轻量迁移系统 — 用 schema_migrations 表追踪已执行的迁移
 * 开发环境（内存 DB）下跳过迁移
 */
export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    console.log('⚠ Skipping migrations (no database configured, using in-memory storage)');
    return;
  }

  // 创建迁移追踪表
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // 获取已执行的迁移
  const executed = await db.query('SELECT version FROM schema_migrations ORDER BY version');
  const executedVersions = new Set(executed.rows.map((r: { version: string }) => r.version));

  // 读取迁移文件
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (executedVersions.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`Running migration: ${file}`);

    try {
      await db.query(sql);
      await db.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      console.log(`✓ Migration ${file} completed`);
    } catch (error) {
      console.error(`✗ Migration ${file} failed:`, error);
      throw error;
    }
  }
}
