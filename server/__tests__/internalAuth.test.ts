import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { internalAuthMiddleware } from '../middleware/internalAuth';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/test', internalAuthMiddleware, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('internalAuthMiddleware', () => {
  it('allows all requests when INTERNAL_API_TOKEN is not set', async () => {
    delete process.env.INTERNAL_API_TOKEN;
    const app = buildApp();
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 401 when token is set but not provided', async () => {
    process.env.INTERNAL_API_TOKEN = 'secret123';
    const app = buildApp();
    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/unauthorized/i);
    delete process.env.INTERNAL_API_TOKEN;
  });

  it('returns 401 when wrong token is provided', async () => {
    process.env.INTERNAL_API_TOKEN = 'secret123';
    const app = buildApp();
    const res = await request(app).get('/test').set('X-Internal-Token', 'wrong');
    expect(res.status).toBe(401);
    delete process.env.INTERNAL_API_TOKEN;
  });

  it('allows request with correct token', async () => {
    process.env.INTERNAL_API_TOKEN = 'secret123';
    const app = buildApp();
    const res = await request(app).get('/test').set('X-Internal-Token', 'secret123');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    delete process.env.INTERNAL_API_TOKEN;
  });
});
