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
  inputTokens: number;
  outputTokens: number;
  tokens: number;
  inputCost: number;
  outputCost: number;
  estimatedCost: number;
  model: string;
}

interface HistoryPoint {
  timestamp: number;
  totalProcessed: number;
  successRate: number;
  cacheHitRate: number;
  avgTime: number;
}

interface MonitoringState {
  metrics: Metrics;
  cacheStats: CacheStats;
  performance: PerformanceMetrics;
  cost: CostStats;
  history: HistoryPoint[];
  lastUpdate: number;
  sync: () => void;
}

const MAX_HISTORY = 60; // keep last 60 snapshots (~5 min at 5s interval)

export const useMonitoringStore = create<MonitoringState>((set, get) => ({
  metrics: getMetrics(),
  cacheStats: cacheAnalyzer.getStats(),
  performance: performanceMonitor.getMetrics(),
  cost: costTracker.getStats(),
  history: [],
  lastUpdate: Date.now(),

  sync: () => {
    const m = getMetrics();
    const prev = get().history;
    const point: HistoryPoint = {
      timestamp: Date.now(),
      totalProcessed: m.totalProcessed,
      successRate: m.successRate,
      cacheHitRate: m.cacheHitRate,
      avgTime: m.avgTime,
    };
    const history = [...prev, point].slice(-MAX_HISTORY);

    set({
      metrics: m,
      cacheStats: cacheAnalyzer.getStats(),
      performance: performanceMonitor.getMetrics(),
      cost: costTracker.getStats(),
      history,
      lastUpdate: Date.now(),
    });
  },
}));
