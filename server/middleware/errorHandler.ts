import type { Request, Response, NextFunction } from 'express';
import { serverLogger } from '../lib/logger';

/**
 * Unified error handling middleware.
 * Must be registered AFTER all routes (Express identifies error handlers by 4-arg signature).
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Multer file size error
  if (err.message?.includes('File too large')) {
    res.status(413).json({ error: 'File too large (max 10MB)' });
    return;
  }

  // Multer unsupported file type
  if (err.message?.startsWith('Unsupported file type')) {
    res.status(400).json({ error: err.message });
    return;
  }

  // JSON parse error
  if ((err as unknown as Record<string, unknown>).type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  // Log unexpected errors
  serverLogger.error(`Unhandled error on ${req.method} ${req.path}`, err);

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
