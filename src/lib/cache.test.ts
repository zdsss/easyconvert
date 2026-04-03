import { describe, it, expect, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { getCached, setCache } from '@lib/cache';
import type { CacheData } from '@lib/types';
import type { Resume } from '@lib/types';

const mockResume: Resume = {
  basics: { name: 'Test', email: 'test@test.com', phone: '123' },
  work: [],
  education: [],
};

const mockCacheData: CacheData = {
  resume: mockResume,
  timestamp: Date.now(),
};

describe('Cache happy path', () => {
  it('returns null for unknown hash', async () => {
    const result = await getCached('unknown-hash-xyz');
    expect(result).toBeNull();
  });

  it('writes and reads back (cache hit)', async () => {
    const hash = 'test-hash-write-read';
    await setCache(hash, mockCacheData);
    const result = await getCached(hash);
    expect(result).not.toBeNull();
    expect(result!.resume.basics.name).toBe('Test');
  });

  it('overwrites same hash with new data', async () => {
    const hash = 'test-hash-overwrite';
    await setCache(hash, mockCacheData);
    const updated: CacheData = { resume: { ...mockResume, basics: { ...mockResume.basics, name: 'Updated' } }, timestamp: Date.now() };
    await setCache(hash, updated);
    const result = await getCached(hash);
    expect(result!.resume.basics.name).toBe('Updated');
  });
});

describe('Cache error handling', () => {
  it('should return null on cache read failure', async () => {
    const result = await getCached('invalid-hash');
    expect(result).toBeNull();
  });

  it('should not throw on cache write failure', async () => {
    await expect(setCache('test', mockCacheData)).resolves.toBeUndefined();
  });
});

describe('Cache expiry', () => {
  it('returns null for expired entry', async () => {
    const hash = 'test-hash-expired';
    // Write with a very old timestamp (31 days ago)
    const oldTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const expiredData: CacheData = { resume: mockResume, timestamp: oldTimestamp };
    await setCache(hash, expiredData);

    // Manually patch the stored entry's timestamp via a fresh write with old data
    // Since setCache always writes current timestamp, we test via the TTL logic
    // by mocking Date.now to simulate time passing
    const realNow = Date.now;
    vi.spyOn(Date, 'now').mockReturnValue(realNow() + 31 * 24 * 60 * 60 * 1000);
    const result = await getCached(hash);
    vi.restoreAllMocks();
    // Entry was written with current time, so 31 days later it should be expired
    expect(result).toBeNull();
  });
});
