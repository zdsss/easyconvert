import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// vi.mock is hoisted, so the mock object must be created inside the factory.
// We access it via the imported `ky` binding.
vi.mock('../db', () => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    selectFrom: vi.fn(),
    select: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
    execute: vi.fn(),
    executeTakeFirst: vi.fn(),
    updateTable: vi.fn(),
    set: vi.fn(),
  };
  // Every chainable method returns the chain itself
  for (const key of Object.keys(chain)) {
    if (key !== 'execute' && key !== 'executeTakeFirst') {
      chain[key].mockReturnValue(chain);
    }
  }
  return { ky: chain };
});

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { ky } from '../db';
import tenantsRouter from '../routes/tenants';

// Cast for easy access to mock fns
const mockKy = ky as unknown as Record<string, ReturnType<typeof vi.fn>>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', tenantsRouter);
  return app;
}

describe('Tenants API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire chainable returns after clearAllMocks resets them
    for (const key of Object.keys(mockKy)) {
      if (key !== 'execute' && key !== 'executeTakeFirst') {
        mockKy[key].mockReturnValue(mockKy);
      }
    }
  });

  it('GET / lists tenants', async () => {
    mockKy.execute.mockResolvedValue([
      { id: 't-1', name: 'Acme', slug: 'acme', created_at: '2026-01-01', quota_per_minute: 200 },
      { id: 't-2', name: 'Default', slug: 'default', created_at: '2026-01-02', quota_per_minute: null },
    ]);
    const app = buildApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].quotaPerMinute).toBe(200);
    expect(res.body[1].quotaPerMinute).toBe(100); // null defaults to 100
  });

  it('GET /:id returns a single tenant', async () => {
    mockKy.executeTakeFirst.mockResolvedValue(
      { id: 't-1', name: 'Acme', slug: 'acme', created_at: '2026-01-01', quota_per_minute: 50 }
    );
    const app = buildApp();
    const res = await request(app).get('/t-1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('t-1');
    expect(res.body.quotaPerMinute).toBe(50);
  });

  it('GET /:id returns 404 for non-existent tenant', async () => {
    mockKy.executeTakeFirst.mockResolvedValue(undefined);
    const app = buildApp();
    const res = await request(app).get('/non-existent');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('PUT /:id/quota updates quota', async () => {
    mockKy.execute.mockResolvedValue([]);
    const app = buildApp();
    const res = await request(app).put('/t-1/quota').send({ quotaPerMinute: 500 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.quotaPerMinute).toBe(500);
  });

  it('PUT /:id/quota returns 400 for invalid quota', async () => {
    const app = buildApp();
    const res = await request(app).put('/t-1/quota').send({ quotaPerMinute: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('PUT /:id/quota returns 400 for missing quota', async () => {
    const app = buildApp();
    const res = await request(app).put('/t-1/quota').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });
});
