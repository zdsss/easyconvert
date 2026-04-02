import { describe, it, expect } from 'vitest';
import { getCached, setCache } from '@lib/cache';
import type { Resume } from '@lib/types';

describe('Cache error handling', () => {
  it('should return null on cache read failure', async () => {
    const result = await getCached('invalid-hash');
    expect(result).toBeNull();
  });

  it('should not throw on cache write failure', async () => {
    const mockResume: Resume = {
      basics: { name: 'Test', email: 'test@test.com', phone: '123' },
      work: [],
      education: [],
    };
    await expect(setCache('test', { resume: mockResume, timestamp: Date.now() })).resolves.toBeUndefined();
  });
});
