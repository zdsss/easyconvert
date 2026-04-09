/** Centralized server configuration — reads from env vars with sensible defaults */
export const config = {
  port: parseInt(process.env.PORT || '3001'),

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    defaultMaxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  },

  cache: {
    ttlDays: parseInt(process.env.CACHE_TTL_DAYS || '30'),
    maxEntries: parseInt(process.env.CACHE_MAX_ENTRIES || '5000'),
    version: process.env.CACHE_VERSION || '2.0',
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || String(10 * 1024 * 1024)),
    maxBodySize: process.env.MAX_BODY_SIZE || '50mb',
  },
};
