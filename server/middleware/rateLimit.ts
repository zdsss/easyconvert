import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';

interface RateLimitEntry {
  timestamps: number[];
}

// 内存 Map 按 API Key 追踪请求时间戳
const rateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 分钟窗口
const DEFAULT_MAX_REQUESTS = 100;

/**
 * 滑动窗口限流中间件
 * Uses per-tenant quota from auth middleware, falls back to DEFAULT_MAX_REQUESTS
 */
export function rateLimitMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // 未认证请求不限流（由 auth 中间件处理）
  if (!req.apiKeyId) {
    return next();
  }

  const key = req.apiKeyId;
  const now = Date.now();
  const windowStart = now - DEFAULT_WINDOW_MS;
  const maxRequests = req.quotaPerMinute || DEFAULT_MAX_REQUESTS;

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }

  // 清理窗口外的时间戳
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + DEFAULT_WINDOW_MS - now) / 1000);

    res.set('Retry-After', String(retryAfter));
    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', '0');
    res.set('X-RateLimit-Reset', String(Math.ceil((oldestInWindow + DEFAULT_WINDOW_MS) / 1000)));
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter,
    });
    return;
  }

  entry.timestamps.push(now);

  const resetTime = entry.timestamps.length > 0
    ? Math.ceil((entry.timestamps[0] + DEFAULT_WINDOW_MS) / 1000)
    : Math.ceil((now + DEFAULT_WINDOW_MS) / 1000);

  res.set('X-RateLimit-Limit', String(maxRequests));
  res.set('X-RateLimit-Remaining', String(maxRequests - entry.timestamps.length));
  res.set('X-RateLimit-Reset', String(resetTime));

  next();
}

// 定期清理过期条目（每 5 分钟）
setInterval(() => {
  const cutoff = Date.now() - DEFAULT_WINDOW_MS;
  for (const [key, entry] of rateLimitStore) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
