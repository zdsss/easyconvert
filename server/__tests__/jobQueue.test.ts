import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger (must be before jobQueue import)
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { jobQueue, Job } from '../lib/jobQueue';

/** Helper: create a job with a controllable execute function */
function makeJob(id: string, execute: () => Promise<void>): Job {
  return { id, status: 'pending', execute };
}

describe('JobQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset internal state by accessing private fields — the queue is a singleton
    // so we need to drain it between tests
    const q = jobQueue as unknown as { queue: unknown[]; processing: number };
    q.queue = [];
    q.processing = 0;
  });

  it('enqueue runs a job and marks it completed', async () => {
    const executeFn = vi.fn().mockResolvedValue(undefined);
    const job = makeJob('job-1', executeFn);

    jobQueue.enqueue(job);

    // Allow microtasks to flush
    await new Promise((r) => setTimeout(r, 50));

    expect(executeFn).toHaveBeenCalledTimes(1);
    expect(job.status).toBe('completed');
  });

  it('getStatus returns correct counts', async () => {
    const executeFn = vi.fn().mockResolvedValue(undefined);
    const job1 = makeJob('job-1', executeFn);
    const job2 = makeJob('job-2', executeFn);

    jobQueue.enqueue(job1);
    jobQueue.enqueue(job2);

    await new Promise((r) => setTimeout(r, 50));

    const status = jobQueue.getStatus();
    expect(status.completed).toBe(2);
    expect(status.queued).toBe(0);
    expect(status.failed).toBe(0);
  });

  it('concurrent limit is respected — max 3 process simultaneously', async () => {
    let concurrentCount = 0;
    let maxConcurrent = 0;
    const resolvers: Array<() => void> = [];

    function makeSlowJob(id: string): Job {
      return makeJob(id, () => new Promise<void>((resolve) => {
        concurrentCount++;
        if (concurrentCount > maxConcurrent) maxConcurrent = concurrentCount;
        resolvers.push(() => {
          concurrentCount--;
          resolve();
        });
      }));
    }

    const jobs = [
      makeSlowJob('j-1'),
      makeSlowJob('j-2'),
      makeSlowJob('j-3'),
      makeSlowJob('j-4'),
      makeSlowJob('j-5'),
    ];

    for (const job of jobs) {
      jobQueue.enqueue(job);
    }

    // Let the first 3 start processing
    await new Promise((r) => setTimeout(r, 50));

    // At this point, 3 should be processing, 2 still pending
    expect(maxConcurrent).toBe(3);
    expect(concurrentCount).toBe(3);

    // Resolve all pending jobs one by one
    while (resolvers.length > 0) {
      const resolver = resolvers.shift()!;
      resolver();
      await new Promise((r) => setTimeout(r, 50));
    }

    // All 5 should be completed now
    const status = jobQueue.getStatus();
    expect(status.completed).toBe(5);
    expect(status.queued).toBe(0);
  });

  it('failed job is marked as failed and does not block queue', async () => {
    const failJob = makeJob('fail-1', () => Promise.reject(new Error('boom')));
    const successJob = makeJob('ok-1', () => Promise.resolve());

    jobQueue.enqueue(failJob);
    jobQueue.enqueue(successJob);

    await new Promise((r) => setTimeout(r, 50));

    expect(failJob.status).toBe('failed');
    expect(successJob.status).toBe('completed');

    const status = jobQueue.getStatus();
    expect(status.failed).toBe(1);
    expect(status.completed).toBe(1);
    expect(status.queued).toBe(0);
  });
});
