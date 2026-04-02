import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processResume } from './resumeProcessor';
import * as cache from '@lib/cache';
import * as extractWithLLM from '@lib/extractWithLLM';

vi.mock('@lib/cache');
vi.mock('@lib/extractWithLLM');
vi.mock('@lib/parsers/parsePdf', () => ({
  parsePdf: vi.fn(() => Promise.resolve('mock pdf text'))
}));

describe('resumeProcessor integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached result when available', async () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockCached: any = {
      resume: { basics: { name: 'Test', email: 'test@test.com', phone: '123' }, work: [], education: [] },
      contentClass: {},
      timestamp: Date.now()
    };

    vi.mocked(cache.hashFile).mockResolvedValue('hash123');
    vi.mocked(cache.getCached).mockResolvedValue(mockCached);

    const result = await processResume(mockFile, { enableCache: true });

    expect(result.fromCache).toBe(true);
    expect(result.resume).toEqual(mockCached.resume);
    expect(extractWithLLM.extractResume).not.toHaveBeenCalled();
  });

  it('processes and caches on cache miss', async () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockResume = { basics: { name: 'Test', email: 'test@test.com', phone: '123' }, work: [], education: [] };

    vi.mocked(cache.hashFile).mockResolvedValue('hash456');
    vi.mocked(cache.getCached).mockResolvedValue(null);
    vi.mocked(extractWithLLM.extractResume).mockResolvedValue(mockResume);

    const result = await processResume(mockFile, { enableCache: true });

    expect(result.fromCache).toBe(false);
    expect(result.resume).toEqual(mockResume);
    expect(cache.setCache).toHaveBeenCalled();
  });
});
