import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock keyService
const mockCreateKey = vi.fn();
const mockListKeys = vi.fn();
const mockDeactivateKey = vi.fn();
vi.mock('../services/keyService', () => ({
  createKey: (...args: unknown[]) => mockCreateKey(...args),
  listKeys: (...args: unknown[]) => mockListKeys(...args),
  deactivateKey: (...args: unknown[]) => mockDeactivateKey(...args),
}));

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import keysRouter from '../routes/keys';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', keysRouter);
  return app;
}

describe('Keys API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('POST / creates a key', async () => {
    const key = { id: 'key-1', name: 'Test Key', key: 'ec_abc123' };
    mockCreateKey.mockResolvedValue(key);
    const app = buildApp();
    const res = await request(app).post('/').send({ name: 'Test Key' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('key-1');
    expect(res.body.key).toBe('ec_abc123');
    expect(mockCreateKey).toHaveBeenCalledWith({ name: 'Test Key' });
  });

  it('POST / returns 400 for missing name', async () => {
    const app = buildApp();
    const res = await request(app).post('/').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/validation/i);
  });

  it('GET / lists keys', async () => {
    const keys = [{ id: 'key-1', name: 'Key 1' }, { id: 'key-2', name: 'Key 2' }];
    mockListKeys.mockResolvedValue(keys);
    const app = buildApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockListKeys).toHaveBeenCalledWith('default');
  });

  it('GET / passes tenantId query param', async () => {
    mockListKeys.mockResolvedValue([]);
    const app = buildApp();
    await request(app).get('/?tenantId=tenant-42');
    expect(mockListKeys).toHaveBeenCalledWith('tenant-42');
  });

  it('DELETE /:id deactivates a key', async () => {
    const key = { id: 'key-1', name: 'Key 1', is_active: false };
    mockDeactivateKey.mockResolvedValue(key);
    const app = buildApp();
    const res = await request(app).delete('/key-1');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('API key deactivated');
    expect(res.body.key.id).toBe('key-1');
    expect(mockDeactivateKey).toHaveBeenCalledWith('key-1');
  });

  it('DELETE /:id returns 404 for missing key', async () => {
    mockDeactivateKey.mockResolvedValue(null);
    const app = buildApp();
    const res = await request(app).delete('/non-existent');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
