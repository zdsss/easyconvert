import { useEffect, useState } from 'react';
import { getMetrics, Metrics } from '@lib/metrics';
import { cacheAnalyzer } from '@lib/cacheAnalyzer';

export default function MetricsPanel() {
  const [metrics, setMetrics] = useState<Metrics>(getMetrics());
  const [cacheStats, setCacheStats] = useState(cacheAnalyzer.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getMetrics());
      setCacheStats(cacheAnalyzer.getStats());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (metrics.totalProcessed === 0) return null;

  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-3">性能指标</h3>
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <span className="text-gray-600">总处理数:</span>
          <span className="ml-2 font-medium">{metrics.totalProcessed}</span>
        </div>
        <div>
          <span className="text-gray-600">成功率:</span>
          <span className="ml-2 font-medium">{metrics.successRate.toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-gray-600">缓存命中率:</span>
          <span className="ml-2 font-medium text-green-600">{(cacheStats.hitRate * 100).toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-gray-600">平均耗时:</span>
          <span className="ml-2 font-medium">{(metrics.avgTime / 1000).toFixed(2)}s</span>
        </div>
      </div>
      {cacheStats.totalRequests > 0 && (
        <div className="pt-3 border-t text-xs text-gray-600">
          缓存详情: {cacheStats.hits}次命中 ({cacheStats.avgHitTime.toFixed(0)}ms) / {cacheStats.misses}次未命中 ({cacheStats.avgMissTime.toFixed(0)}ms)
        </div>
      )}
    </div>
  );
}
