import pLimit from 'p-limit';
import { CONCURRENCY_CONFIG } from './constants';

class ConcurrencyManager {
  private limiter = pLimit(CONCURRENCY_CONFIG.DEFAULT_LIMIT);
  private status = { pending: 0, active: 0, completed: 0 };

  setLimit(limit: number) {
    if (limit < 1 || limit > CONCURRENCY_CONFIG.MAX_LIMIT) {
      throw new Error(`Limit must be 1-${CONCURRENCY_CONFIG.MAX_LIMIT}`);
    }
    this.limiter = pLimit(limit);
  }

  getStatus() {
    return { ...this.status };
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.status.pending++;
    try {
      const result = await this.limiter(async () => {
        this.status.pending--;
        this.status.active++;
        try {
          return await fn();
        } finally {
          this.status.active--;
          this.status.completed++;
        }
      });
      return result;
    } catch (error) {
      this.status.pending--;
      throw error;
    }
  }
}

export const concurrency = new ConcurrencyManager();
export const runWithLimit = <T>(fn: () => Promise<T>) => concurrency.run(fn);
export const getQueueStatus = () => concurrency.getStatus();
export const setMaxConcurrency = (limit: number) => concurrency.setLimit(limit);
