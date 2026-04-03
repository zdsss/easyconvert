import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processBatch } from './batchProcessor';
import * as resumeProcessor from '@lib/core/resumeProcessor';

vi.mock('@lib/core/resumeProcessor');

const makeFile = (name: string, content = 'test') =>
  new File([content], name, { type: 'application/pdf' });

describe('batchProcessor integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes multiple files and categorizes errors', async () => {
    const files = [
      makeFile('resume1.pdf', 'test1'),
      makeFile('resume2.pdf', 'test2'),
    ];

    vi.mocked(resumeProcessor.processResume)
      .mockResolvedValueOnce({ resume: { basics: { name: 'Test1', email: 'test@test.com', phone: '123' }, work: [], education: [] }, fromCache: false, hash: 'h1' })
      .mockRejectedValueOnce(new Error('LLM API timeout'));

    const results = await processBatch(files);

    expect(results).toHaveLength(2);
    const successResults = results.filter(r => r.success);
    const failureResults = results.filter(r => !r.success);
    expect(successResults).toHaveLength(1);
    expect(failureResults).toHaveLength(1);
    expect(failureResults[0].errorCategory).toBe('timeout');
  });

  it('all files succeed', async () => {
    const files = [makeFile('a.pdf'), makeFile('b.pdf')];
    vi.mocked(resumeProcessor.processResume)
      .mockResolvedValue({ resume: { basics: { name: 'OK', email: 'ok@ok.com', phone: '000' }, work: [], education: [] }, fromCache: false, hash: 'hx' });

    const results = await processBatch(files);
    expect(results.every(r => r.success)).toBe(true);
    expect(results).toHaveLength(2);
  });

  it('all files fail', async () => {
    const files = [makeFile('a.pdf'), makeFile('b.pdf')];
    vi.mocked(resumeProcessor.processResume)
      .mockRejectedValue(new Error('LLM API error'));

    const results = await processBatch(files);
    expect(results.every(r => !r.success)).toBe(true);
    expect(results[0].errorCategory).toBe('llm');
  });

  it('throws on empty files array', async () => {
    await expect(processBatch([])).rejects.toThrow('Files array cannot be empty');
  });

  it('throws on invalid file type', async () => {
    const files = [new File(['test'], 'resume.txt', { type: 'text/plain' })];
    await expect(processBatch(files)).rejects.toThrow('Invalid file types');
  });

  it('fires onFileComplete callback for each file', async () => {
    const files = [makeFile('a.pdf'), makeFile('b.pdf')];
    vi.mocked(resumeProcessor.processResume)
      .mockResolvedValue({ resume: { basics: { name: 'OK', email: 'ok@ok.com', phone: '000' }, work: [], education: [] }, fromCache: false, hash: 'hx' });

    const onFileComplete = vi.fn();
    await processBatch(files, { onFileComplete });

    expect(onFileComplete).toHaveBeenCalledTimes(2);
    expect(onFileComplete).toHaveBeenCalledWith('a.pdf', true, false);
    expect(onFileComplete).toHaveBeenCalledWith('b.pdf', true, false);
  });

  it('fires onProgress callback after each batch', async () => {
    const files = [makeFile('a.pdf'), makeFile('b.pdf')];
    vi.mocked(resumeProcessor.processResume)
      .mockResolvedValue({ resume: { basics: { name: 'OK', email: 'ok@ok.com', phone: '000' }, work: [], education: [] }, fromCache: false, hash: 'hx' });

    const onProgress = vi.fn();
    await processBatch(files, { onProgress });

    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });
});
