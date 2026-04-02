import { create } from 'zustand';
import { getMetrics, Metrics } from '../metrics';
import { cacheAnalyzer } from '../cacheAnalyzer';
import { performanceMonitor } from '../monitoring/performance';
import { costTracker } from '../monitoring/cost';

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  avgHitTime: number;
  avgMissTime: number;
}

interface PerformanceMetrics {
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

interface CostStats {
  calls: number;
  tokens: number;
  estimatedCost: number;
}

interface MonitoringState {
  metrics: Metrics;
  cacheStats: CacheStats;
  performance: PerformanceMetrics;
  cost: CostStats;
  lastUpdate: number;
  sync: () => void;
}

export const useMonitoringStore = create<MonitoringState>((set) => ({
  metrics: getMetrics(),
  cacheStats: cacheAnalyzer.getStats(),
  performance: performanceMonitor.getMetrics(),
  cost: costTracker.getStats(),
  lastUpdate: Date.now(),

  sync: () => set({
    metrics: getMetrics(),
    cacheStats: cacheAnalyzer.getStats(),
    performance: performanceMonitor.getMetrics(),
    cost: costTracker.getStats(),
    lastUpdate: Date.now(),
  }),
}));
