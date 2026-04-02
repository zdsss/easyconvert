interface Metrics {
  errorRate: number;
  cacheHitRate: number;
  queueDepth: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheMisses: number;
}

class MetricsCollector {
  private metrics: Metrics = {
    errorRate: 0,
    cacheHitRate: 0,
    queueDepth: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  recordSuccess() {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.updateRates();
  }

  recordFailure() {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.updateRates();
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
    this.updateRates();
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
    this.updateRates();
  }

  setQueueDepth(depth: number) {
    this.metrics.queueDepth = depth;
  }

  private updateRates() {
    if (this.metrics.totalRequests > 0) {
      this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;
    }
    const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (totalCacheOps > 0) {
      this.metrics.cacheHitRate = this.metrics.cacheHits / totalCacheOps;
    }
  }

  getMetrics(): Metrics {
    return { ...this.metrics };
  }
}

export const metricsCollector = new MetricsCollector();
