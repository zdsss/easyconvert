import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { errorHandler } from '../middleware/errorHandler';

/** Build an app that throws the given error from a route, then uses errorHandler */
function buildApp(err: Error) {
  const app = express();
  app.use(express.json());
  app.get('/boom', (_req, _res, next) => { next(err); });
  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  it('returns 413 for Multer file too large', async () => {
    const err = new Error('File too large');
    const res = await request(buildApp(err)).get('/boom');
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/file too large/i);
  });

  it('returns 400 for unsupported file type', async () => {
    const err = new Error('Unsupported file type: application/zip');
    const res = await request(buildApp(err)).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported file type/i);
  });

  it('returns 400 for JSON parse error', async () => {
    const err = Object.assign(new Error('Unexpected token'), { type: 'entity.parse.failed' });
    const res = await request(buildApp(err)).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid JSON');
  });

  it('returns 500 for unknown errors (non-production)', async () => {
    const original = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    const err = new Error('Something broke');
    const res = await request(buildApp(err)).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Something broke');
    process.env.NODE_ENV = original;
  });
});
