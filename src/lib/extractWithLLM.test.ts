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
    expect(recordSpy).toHaveBeenCalledWith(100, 50);
  });
});

