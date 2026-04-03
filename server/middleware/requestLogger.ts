import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { serverLogger } from '../lib/logger';

/**
 * 结构化请求日志 + 请求 ID
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const startTime = Date.now();

  // 注入请求 ID
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  // 响应完成时记录日志
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const meta = {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      contentLength: res.get('content-length'),
    };

    if (res.statusCode >= 500) {
      serverLogger.error(`${req.method} ${req.path} ${res.statusCode}`, undefined, meta);
    } else if (res.statusCode >= 400) {
      serverLogger.warn(`${req.method} ${req.path} ${res.statusCode}`, meta);
    } else {
      serverLogger.info(`${req.method} ${req.path} ${res.statusCode}`, meta);
    }
  });

  next();
}
