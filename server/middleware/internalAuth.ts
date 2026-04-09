import type { Request, Response, NextFunction } from 'express';

/**
 * Optional authentication for internal routes.
 * When INTERNAL_API_TOKEN is set, requires X-Internal-Token header.
 * When not set, allows all requests (development mode).
 */
export function internalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.INTERNAL_API_TOKEN;

  // No token configured — allow all (development mode)
  if (!token) return next();

  const provided = req.headers['x-internal-token'];
  if (provided === token) return next();

  res.status(401).json({ error: 'Unauthorized: invalid or missing X-Internal-Token header' });
}
