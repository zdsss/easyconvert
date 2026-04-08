interface PerformanceMetrics {
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

const MAX_LATENCIES = 1000;

class PerformanceMonitor {
  private sorted: number[] = [];

  record(ms: number) {
    // Binary search insertion to maintain sorted order
    let lo = 0, hi = this.sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.sorted[mid] < ms) lo = mid + 1;
      else hi = mid;
    }
    this.sorted.splice(lo, 0, ms);
    if (this.sorted.length > MAX_LATENCIES) this.sorted.shift();
  }

  getMetrics(): PerformanceMetrics {
    const len = this.sorted.length;
    return {
      p50: this.sorted[Math.floor(len * 0.5)] || 0,
      p95: this.sorted[Math.floor(len * 0.95)] || 0,
      p99: this.sorted[Math.floor(len * 0.99)] || 0,
      count: len,
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
