import type { Request, Response, NextFunction } from 'express';
import { serverLogger } from './logger';

/**
 * Wraps an async route handler to catch errors and forward them to Express error handling.
 * Eliminates repetitive try/catch blocks in every route handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      serverLogger.error(message, error instanceof Error ? error : new Error(String(error)));
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      }
    });
  };
}
