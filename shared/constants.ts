export const DIFFICULTY_THRESHOLDS = {
  EASY: -1,
  STANDARD: 1,
} as const;

export const MODULE_COUNT_THRESHOLDS = {
  SIMPLE: 4,
  STANDARD: 7,
} as const;

export const CACHE_CONFIG = {
  TTL_DAYS: 30,
  MAX_SIZE: 100 * 1024 * 1024,
  MAX_ENTRIES: 5000,
} as const;

export const CONCURRENCY_CONFIG = {
  DEFAULT_LIMIT: 2,
  MAX_LIMIT: 5,
} as const;

export const BATCH_CONFIG = {
  DELAY_MS: 1000,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const;
