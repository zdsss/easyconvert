import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { asyncHandler } from '../lib/asyncHandler';

function buildApp(handler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.get('/test', handler);
  app.post('/test', handler);
  return app;
}

describe('asyncHandler', () => {
  it('passes successful responses through', async () => {
    const handler = asyncHandler(async (_req, res) => {
      res.json({ ok: true });
    });
    const app = buildApp(handler);
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('catches thrown errors and returns 500', async () => {
    const handler = asyncHandler(async () => {
      throw new Error('Something broke');
    });
    const app = buildApp(handler);
    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Something broke');
  });

  it('catches non-Error throws and returns 500', async () => {
    const handler = asyncHandler(async () => {
      throw 'string error';
    });
    const app = buildApp(handler);
    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Unknown error');
  });

  it('preserves custom status codes set before throw', async () => {
    const handler = asyncHandler(async (_req, res) => {
      res.status(201).json({ created: true });
    });
    const app = buildApp(handler);
    const res = await request(app).get('/test');
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
  });
});
