import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseHistoryApi } from '../parseHistoryApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function okResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data), text: () => Promise.resolve('') };
}

function errorResponse(status: number, body: string) {
  return { ok: false, status, json: () => Promise.resolve({}), text: () => Promise.resolve(body) };
}

describe('parseHistoryApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('list fetches with pagination params', async () => {
    const response = { items: [], total: 0, page: 1, limit: 20 };
    mockFetch.mockResolvedValue(okResponse(response));
    const result = await parseHistoryApi.list(2, 10);
    expect(result).toEqual(response);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });

  it('list includes status and search filters', async () => {
    mockFetch.mockResolvedValue(okResponse({ items: [], total: 0, page: 1, limit: 20 }));
    await parseHistoryApi.list(1, 20, 'completed', 'test');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('status=completed');
    expect(url).toContain('search=test');
  });

  it('get fetches by id', async () => {
    const item = { id: '1', file_name: 'test.pdf' };
    mockFetch.mockResolvedValue(okResponse(item));
    const result = await parseHistoryApi.get('1');
    expect(result).toEqual(item);
  });

  it('save sends POST', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: '1' }));
    await parseHistoryApi.save({ fileName: 'test.pdf', status: 'completed' });
    expect(mockFetch.mock.calls[0][0]).toBe('/api/parse-history');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('remove sends DELETE', async () => {
    mockFetch.mockResolvedValue(okResponse(undefined));
    await parseHistoryApi.remove('1');
    expect(mockFetch.mock.calls[0][0]).toBe('/api/parse-history/1');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  it('clearAll sends DELETE to base', async () => {
    mockFetch.mockResolvedValue(okResponse(undefined));
    await parseHistoryApi.clearAll();
    expect(mockFetch.mock.calls[0][0]).toBe('/api/parse-history');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, 'Not found'));
    await expect(parseHistoryApi.get('999')).rejects.toThrow('HTTP 404: Not found');
  });
});
