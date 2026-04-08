export interface Metrics {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  cacheHits: number;
  totalTime: number;
  avgTime: number;
  successRate: number;
  cacheHitRate: number;
}

let metrics: Metrics = {
  totalProcessed: 0,
  successCount: 0,
  failureCount: 0,
  cacheHits: 0,
  totalTime: 0,
  avgTime: 0,
  successRate: 0,
  cacheHitRate: 0
};

export function recordSuccess(time: number, fromCache: boolean) {
  metrics.totalProcessed++;
  metrics.successCount++;
  if (fromCache) metrics.cacheHits++;
  else metrics.totalTime += time;
  updateRates();
}

export function recordFailure() {
  metrics.totalProcessed++;
  metrics.failureCount++;
  updateRates();
}

function updateRates() {
  metrics.successRate = metrics.totalProcessed > 0
    ? (metrics.successCount / metrics.totalProcessed) * 100 : 0;
  metrics.cacheHitRate = metrics.totalProcessed > 0
    ? (metrics.cacheHits / metrics.totalProcessed) * 100 : 0;
  const nonCached = metrics.successCount - metrics.cacheHits;
  metrics.avgTime = nonCached > 0 ? metrics.totalTime / nonCached : 0;
}

export function getMetrics(): Metrics {
  return { ...metrics };
}

