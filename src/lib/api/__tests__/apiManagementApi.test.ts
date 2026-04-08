import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiManagementApi } from '../apiManagementApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function okResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data), text: () => Promise.resolve('') };
}

function errorResponse(status: number, body: string) {
  return { ok: false, status, json: () => Promise.resolve({}), text: () => Promise.resolve(body) };
}

describe('apiManagementApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('getKeys fetches with tenantId', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await apiManagementApi.getKeys('tenant-1');
    expect(mockFetch).toHaveBeenCalledWith('/api/keys?tenantId=tenant-1');
  });

  it('getKeys uses default tenantId', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await apiManagementApi.getKeys();
    expect(mockFetch).toHaveBeenCalledWith('/api/keys?tenantId=default');
  });

  it('createKey sends POST with body', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: '1', name: 'test-key' }));
    await apiManagementApi.createKey({ name: 'test-key' });
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe('/api/keys');
    expect(call[1].method).toBe('POST');
    const body = JSON.parse(call[1].body);
    expect(body.name).toBe('test-key');
    expect(body.tenantId).toBe('default');
  });

  it('deleteKey sends DELETE', async () => {
    mockFetch.mockResolvedValue(okResponse(undefined));
    await apiManagementApi.deleteKey('key-1');
    expect(mockFetch).toHaveBeenCalledWith('/api/keys/key-1', { method: 'DELETE' });
  });

  it('getUsageStats fetches with params', async () => {
    mockFetch.mockResolvedValue(okResponse({ totalRequests: 100 }));
    await apiManagementApi.getUsageStats('tenant-1', 30);
    expect(mockFetch).toHaveBeenCalledWith('/api/usage?tenantId=tenant-1&days=30');
  });

  it('getApiOverview fetches overview', async () => {
    mockFetch.mockResolvedValue(okResponse({ activeKeys: 2 }));
    const result = await apiManagementApi.getApiOverview('tenant-1');
    expect(result.activeKeys).toBe(2);
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValue(errorResponse(401, 'Unauthorized'));
    await expect(apiManagementApi.getKeys()).rejects.toThrow('HTTP 401: Unauthorized');
  });
});
