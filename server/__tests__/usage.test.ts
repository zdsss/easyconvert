import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock db
const mockQuery = vi.fn();
vi.mock('../db', () => ({ default: { query: (...args: unknown[]) => mockQuery(...args) } }));

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

// Mock tenant
vi.mock('../lib/tenant', () => ({ resolveTenantId: vi.fn().mockResolvedValue('tenant-uuid') }));

import usageRouter from '../routes/usage';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', usageRouter);
  return app;
}

describe('Usage API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET / returns usage stats', async () => {
    // Mock the 4 sequential queries: summary, daily, latency, endpoint
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ total: '10', success_count: '8', fail_count: '2', avg_latency: '250.5', total_tokens: '5000' }],
      })
      .mockResolvedValueOnce({
        rows: [{ date: '2026-04-08', count: '3' }],
      })
      .mockResolvedValueOnce({
        rows: [{ lt100: '2', lt500: '4', lt1000: '2', lt3000: '1', gt3000: '1' }],
      })
      .mockResolvedValueOnce({
        rows: [{ endpoint: '/api/v1/parse', count: '10', avg_latency: '250' }],
      });

    const app = buildApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBe(10);
    expect(res.body.successRate).toBe(80);
    expect(res.body.avgLatency).toBe(251);
    expect(res.body.totalTokens).toBe(5000);
    expect(res.body.requestsByEndpoint).toHaveLength(1);
    expect(res.body.requestsByDay).toBeInstanceOf(Array);
    expect(res.body.latencyDistribution).toHaveLength(5);
  });

  it('GET / returns empty data on DB failure', async () => {
    mockQuery.mockRejectedValue(new Error('DB connection failed'));
    const app = buildApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBe(0);
    expect(res.body.successRate).toBe(0);
    expect(res.body.avgLatency).toBe(0);
    expect(res.body.totalTokens).toBe(0);
    expect(res.body.requestsByEndpoint).toEqual([]);
    expect(res.body.requestsByDay).toEqual([]);
    expect(res.body.latencyDistribution).toEqual([]);
  });

  it('GET /overview returns overview data', async () => {
    // Mock the 4 sequential queries: activeKeys, totalRequests, trend, recentCount
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })   // active keys
      .mockResolvedValueOnce({ rows: [{ total: '42' }] })   // total requests
      .mockResolvedValueOnce({ rows: [{ date: '2026-04-08', count: '5' }] }) // trend
      .mockResolvedValueOnce({ rows: [{ count: '7' }] });   // recent count

    const app = buildApp();
    const res = await request(app).get('/overview');
    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe('default');
    expect(res.body.activeKeys).toBe(3);
    expect(res.body.totalRequests).toBe(42);
    expect(res.body.requestTrend).toBeInstanceOf(Array);
    expect(res.body.requestTrend).toHaveLength(7);
    expect(res.body.rateLimitUsage).toBe(7);
  });

  it('GET /overview returns fallback on DB failure', async () => {
    mockQuery.mockRejectedValue(new Error('DB connection failed'));
    const app = buildApp();
    const res = await request(app).get('/overview');
    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe('default');
    expect(res.body.activeKeys).toBe(0);
    expect(res.body.totalRequests).toBe(0);
    expect(res.body.rateLimitUsage).toBe(0);
    expect(res.body.requestTrend).toEqual([]);
  });
});
