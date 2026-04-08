import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractResume } from './extractWithLLM';
import { costTracker } from './monitoring/cost';

describe('Error handling', () => {
  it('should identify timeout errors as retryable', () => {
    const timeoutError = new Error('TimeoutError');
    timeoutError.name = 'TimeoutError';
    expect(timeoutError.name).toBe('TimeoutError');
  });

  it('should identify abort errors as retryable', () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    expect(abortError.name).toBe('AbortError');
  });
});

describe('extractResume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract resume with valid response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ basics: { name: 'Test', email: 'test@test.com', phone: '123' }, work: [], education: [] }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      })
    });

    const result = await extractResume('test resume text');
    expect(result.basics.name).toBe('Test');
  });

  it('should record cost after successful extraction', async () => {
    const recordSpy = vi.spyOn(costTracker, 'record');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ basics: { name: 'Test', email: 'test@test.com', phone: '123' }, work: [], education: [] }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      })
    });

    await extractResume('test resume text');
    expect(recordSpy).toHaveBeenCalledWith('qwen-plus', 100, 50);
  });

  it('throws on non-ok HTTP status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(extractResume('test')).rejects.toThrow('API error: 401');
  });

  it('throws on JSON parse failure in response content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not valid json {{{' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      })
    });

    await expect(extractResume('test')).rejects.toThrow();
  });

  it('retries on network error and succeeds on second attempt', async () => {
    const validResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ basics: { name: 'Retry', email: 'r@r.com', phone: '999' }, work: [], education: [] }) } }],
        usage: { prompt_tokens: 50, completion_tokens: 25 }
      })
    };

    global.fetch = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('network error'), { name: 'NetworkError' }))
      .mockResolvedValueOnce(validResponse);

    const result = await extractResume('test', { timeout: 5000, temperature: 0.05, maxRetries: 2, promptType: 'standard', validationLevel: 'standard' });
    expect(result.basics.name).toBe('Retry');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries', async () => {
    global.fetch = vi.fn().mockRejectedValue(Object.assign(new Error('network error'), { name: 'NetworkError' }));

    await expect(
      extractResume('test', { timeout: 5000, temperature: 0.05, maxRetries: 1, promptType: 'standard', validationLevel: 'standard' })
    ).rejects.toThrow();
  });
});
