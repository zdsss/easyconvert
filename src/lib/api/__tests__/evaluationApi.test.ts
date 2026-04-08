import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluationApi } from '../evaluationApi';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function okResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data), text: () => Promise.resolve('') };
}

function errorResponse(status: number, body: string) {
  return { ok: false, status, json: () => Promise.resolve({}), text: () => Promise.resolve(body) };
}

describe('evaluationApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('getTasks fetches with query params', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    const result = await evaluationApi.getTasks({ page: 1, status: 'completed' });
    expect(result).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/evaluations?'));
    expect(mockFetch.mock.calls[0][0]).toContain('status=completed');
  });

  it('getTask fetches by id', async () => {
    const task = { id: '1', name: 'Test' };
    mockFetch.mockResolvedValue(okResponse(task));
    const result = await evaluationApi.getTask('1');
    expect(result).toEqual(task);
    expect(mockFetch).toHaveBeenCalledWith('/api/evaluations/1');
  });

  it('createTask sends POST with body', async () => {
    const data = { name: 'Test', type: 'batch', config: { enableFieldLevel: true, enableClassification: false, enableProcessTrace: false, accuracyMethod: 'exact' as const } };
    mockFetch.mockResolvedValue(okResponse({ id: '1', ...data }));
    await evaluationApi.createTask(data);
    expect(mockFetch).toHaveBeenCalledWith('/api/evaluations', expect.objectContaining({ method: 'POST' }));
  });

  it('getResults fetches by taskId', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await evaluationApi.getResults('task-1');
    expect(mockFetch).toHaveBeenCalledWith('/api/evaluations/task-1/results');
  });

  it('retryFailed sends POST', async () => {
    mockFetch.mockResolvedValue(okResponse({ retriedCount: 3 }));
    const result = await evaluationApi.retryFailed('task-1');
    expect(result.retriedCount).toBe(3);
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, 'Server error'));
    await expect(evaluationApi.getTasks()).rejects.toThrow('HTTP 500: Server error');
  });
});
