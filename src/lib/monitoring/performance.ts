interface PerformanceMetrics {
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

class PerformanceMonitor {
  private latencies: number[] = [];

  record(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 1000) this.latencies.shift();
  }

  getMetrics(): PerformanceMetrics {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      count: sorted.length
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
