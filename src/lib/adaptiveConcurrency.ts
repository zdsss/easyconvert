import { setMaxConcurrency, getQueueStatus } from './concurrency';
import { logger } from './logger';

class AdaptiveConcurrency {
  private currentLimit = 2;
  private latencies: number[] = [];
  private errorRate = 0;

  adjust() {
    const status = getQueueStatus();
    const avgLatency = this.latencies.slice(-10).reduce((a, b) => a + b, 0) / 10;

    if (avgLatency < 5000 && this.errorRate < 0.1 && status.pending > 5) {
      this.currentLimit = Math.min(8, this.currentLimit + 1);
    } else if (avgLatency > 15000 || this.errorRate > 0.2) {
      this.currentLimit = Math.max(1, this.currentLimit - 1);
    }

    setMaxConcurrency(this.currentLimit);
    logger.debug('Adjusted concurrency', { limit: this.currentLimit, avgLatency, errorRate: this.errorRate });
  }

  recordLatency(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 50) this.latencies.shift();
  }

  recordError() {
    this.errorRate = (this.errorRate * 0.9) + 0.1;
  }

  recordSuccess() {
    this.errorRate = this.errorRate * 0.95;
  }
}

export const adaptiveConcurrency = new AdaptiveConcurrency();
