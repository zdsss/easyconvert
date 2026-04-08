import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CacheData } from './types';
import { logger } from './logger';

const CACHE_TTL_DAYS = 30;
const CACHE_MAX_ENTRIES = 5000;

interface CacheDB extends DBSchema {
  resumes: {
    key: string;
    value: {
      hash: string;
      data: CacheData;
      timestamp: number;
      version: string;
    };
  };
}

const DB_NAME = 'resume-cache';
const STORE_NAME = 'resumes';
const VERSION = '2.0';

let db: IDBPDatabase<CacheDB> | null = null;

async function getDB() {
  if (!db) {
    db = await openDB<CacheDB>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return db;
}

/**
 * 计算文件的 SHA-256 哈希值
 * @param file - 要计算哈希的文件
 * @returns 十六进制格式的哈希字符串
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 从缓存中获取简历数据
 * @param hash - 文件哈希值
 * @returns 缓存的简历数据，如果不存在或已过期则返回 null
 */
export async function getCached(hash: string): Promise<CacheData | null> {
  try {
    const database = await getDB();
    const cached = await database.get(STORE_NAME, hash);

    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const maxAge = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

    if (age > maxAge || cached.version !== VERSION) {
      await database.delete(STORE_NAME, hash);
      return null;
    }

    return cached.data;
  } catch (error) {
    logger.warn('Cache read failed', { error });
    return null;
  }
}

/**
 * 将简历数据存入缓存
 * @param hash - 文件哈希值
 * @param data - 要缓存的简历数据
 */
export async function setCache(hash: string, data: CacheData): Promise<void> {
  try {
    const database = await getDB();

    // Check cache size
    const allKeys = await database.getAllKeys(STORE_NAME);
    logger.debug('Cache: Saving hash', { hash, totalEntries: allKeys.length });
    if (allKeys.length >= CACHE_MAX_ENTRIES) {
      await cleanOldestEntries(database);
    }

    await database.put(
      STORE_NAME,
      {
        hash,
        data,
        timestamp: Date.now(),
        version: VERSION,
      },
      hash
    );
  } catch (error) {
    logger.warn('Cache write failed', { error });
  }
}

async function cleanOldestEntries(database: IDBPDatabase<CacheDB>): Promise<void> {
  try {
    const allEntries = await database.getAll(STORE_NAME);
    allEntries.sort((a, b) => a.timestamp - b.timestamp);

    const toDelete = allEntries.slice(0, Math.floor(CACHE_MAX_ENTRIES * 0.2));
    for (const entry of toDelete) {
      await database.delete(STORE_NAME, entry.hash);
    }

    logger.info('Cleaned old cache entries', { deleted: toDelete.length });
  } catch (error) {
    logger.warn('Cache cleanup failed', { error });
  }
}
