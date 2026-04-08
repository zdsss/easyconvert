import { describe, it, expect, beforeEach } from 'vitest';
import { deduplicateRequest } from '@shared/llmCache';

describe('llmCache', () => {
  beforeEach(() => {
    // deduplicateRequest auto-cleans on finally, no manual clear needed
  });

  it('should deduplicate concurrent requests', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'result';
    };

    const [r1, r2] = await Promise.all([
      deduplicateRequest('key1', fn),
      deduplicateRequest('key1', fn)
    ]);

    expect(r1).toBe('result');
    expect(r2).toBe('result');
    expect(callCount).toBe(1);
  });

  it('should allow different keys', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return 'result';
    };

    await Promise.all([
      deduplicateRequest('key1', fn),
      deduplicateRequest('key2', fn)
    ]);

    expect(callCount).toBe(2);
  });
});
