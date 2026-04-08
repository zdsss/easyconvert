import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Mock db
const mockQuery = vi.fn();
vi.mock('../db', () => ({ default: { query: (...args: unknown[]) => mockQuery(...args) } }));

import { authMiddleware } from '../middleware/auth';

function createMockReq(authHeader?: string): Partial<Request> {
  return {
    path: '/api/v1/parse',
    headers: { authorization: authHeader },
  };
}

function createMockRes() {
  const res = { statusCode: 200, headers: {}, body: undefined as unknown } as Response & { body: unknown };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; }) as unknown as Response['status'];
  res.json = vi.fn((data: unknown) => { res.body = data; return res; }) as unknown as Response['json'];
  res.set = vi.fn() as unknown as Response['set'];
  return res;
}

describe('authMiddleware', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('should skip auth for internal routes', async () => {
    const req = { path: '/api/evaluations', headers: {} } as Partial<Request>;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await authMiddleware(req as Request, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 for missing Authorization header', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await authMiddleware(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.body as { error: string }).error).toContain('Missing');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid API key', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const req = createMockReq('Bearer invalid_key');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await authMiddleware(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.body as { error: string }).error).toContain('Invalid');
  });

  it('should return 401 for deactivated key', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: '1', tenant_id: 't1', scopes: ['parse'], is_active: false, expires_at: null }],
    });

    const req = createMockReq('Bearer some_key');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await authMiddleware(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.body as { error: string }).error).toContain('deactivated');
  });

  it('should return 401 for expired key', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        id: '1', tenant_id: 't1', scopes: ['parse'], is_active: true,
        expires_at: new Date('2020-01-01').toISOString(),
      }],
    });

    const req = createMockReq('Bearer some_key');
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await authMiddleware(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.body as { error: string }).error).toContain('expired');
  });

  it('should authenticate valid key and inject tenant info', async () => {
    const apiKey = 'ec_test_valid_key';

    mockQuery.mockImplementation((text: string) => {
      if (text.includes('SELECT')) {
        return Promise.resolve({
          rows: [{
            id: 'key1', tenant_id: 'tenant1', scopes: ['parse', 'batch'],
            rate_limit: 100, is_active: true, expires_at: null,
          }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const req = createMockReq(`Bearer ${apiKey}`) as Record<string, unknown>;
    const res = createMockRes();
    const next = vi.fn() as unknown as NextFunction;

    await authMiddleware(req as unknown as Request, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.tenantId).toBe('tenant1');
    expect(req.apiKeyId).toBe('key1');
    expect(req.scopes).toEqual(['parse', 'batch']);
  });
});
