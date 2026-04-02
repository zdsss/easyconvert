import { describe, it, expect, vi } from 'vitest';
import { processBatch } from './batchProcessor';
import * as resumeProcessor from '@lib/core/resumeProcessor';

vi.mock('@lib/core/resumeProcessor');

describe('batchProcessor integration', () => {
  it('processes multiple files and categorizes errors', async () => {
    const files = [
      new File(['test1'], 'resume1.pdf', { type: 'application/pdf' }),
      new File(['test2'], 'resume2.pdf', { type: 'application/pdf' })
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
});
