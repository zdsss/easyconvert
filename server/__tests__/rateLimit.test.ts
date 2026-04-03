import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimitMiddleware } from '../middleware/rateLimit';

function createMockReq(apiKeyId?: string) {
  return { apiKeyId } as any;
}

function createMockRes() {
  const res: any = { headers: {} };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((data: any) => { res.body = data; return res; });
  res.set = vi.fn((key: string, value: string) => { res.headers[key] = value; });
  return res;
}

describe('rateLimitMiddleware', () => {
  it('should pass through unauthenticated requests', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    rateLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow requests within limit', () => {
    const req = createMockReq('test-key-1');
    const res = createMockRes();
    const next = vi.fn();

    rateLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
  });

  it('should return 429 when limit exceeded', () => {
    const keyId = 'test-key-overflow';

    // Exhaust the limit
    for (let i = 0; i < 100; i++) {
      const req = createMockReq(keyId);
      const res = createMockRes();
      const next = vi.fn();
      rateLimitMiddleware(req, res, next);
    }

    // Next request should be rate limited
    const req = createMockReq(keyId);
    const res = createMockRes();
    const next = vi.fn();

    rateLimitMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.body.error).toContain('Rate limit');
    expect(next).not.toHaveBeenCalled();
  });
});
