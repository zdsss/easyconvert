import { useEffect } from 'react';
import { useMonitoringStore } from '@lib/store/monitoringStore';

export default function Dashboard() {
  const { metrics, cacheStats, performance, cost, sync } = useMonitoringStore();

  useEffect(() => {
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, [sync]);

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-gray-800">监控仪表盘</h2>

      {/* Metrics Overview */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="总处理数"
          value={metrics.totalProcessed}
          icon="📊"
        />
        <MetricCard
          title="成功率"
          value={`${metrics.successRate.toFixed(1)}%`}
          icon="✅"
          color="green"
        />
        <MetricCard
          title="缓存命中率"
          value={`${metrics.cacheHitRate.toFixed(1)}%`}
          icon="💾"
          color="blue"
        />
        <MetricCard
          title="平均耗时"
          value={`${(metrics.avgTime / 1000).toFixed(2)}s`}
          icon="⏱️"
          color="purple"
        />
      </div>

      {/* Performance */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">性能指标</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">P50 延迟</p>
            <p className="text-2xl font-bold text-gray-800">{performance.p50}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">P95 延迟</p>
            <p className="text-2xl font-bold text-gray-800">{performance.p95}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">P99 延迟</p>
            <p className="text-2xl font-bold text-gray-800">{performance.p99}ms</p>
          </div>
        </div>
      </div>

      {/* Cache Analysis */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">缓存分析</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">命中 vs 未命中</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-green-100 rounded p-3 text-center">
                <p className="text-sm text-gray-600">命中</p>
                <p className="text-xl font-bold text-green-700">{cacheStats.hits}</p>
              </div>
              <div className="flex-1 bg-red-100 rounded p-3 text-center">
                <p className="text-sm text-gray-600">未命中</p>
                <p className="text-xl font-bold text-red-700">{cacheStats.misses}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">平均查询时间</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-blue-100 rounded p-3 text-center">
                <p className="text-sm text-gray-600">命中</p>
                <p className="text-xl font-bold text-blue-700">{cacheStats.avgHitTime.toFixed(1)}ms</p>
              </div>
              <div className="flex-1 bg-orange-100 rounded p-3 text-center">
                <p className="text-sm text-gray-600">未命中</p>
                <p className="text-xl font-bold text-orange-700">{cacheStats.avgMissTime.toFixed(1)}ms</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Tracker */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">成本追踪</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">API 调用</p>
            <p className="text-2xl font-bold text-gray-800">{cost.calls}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">总 Token</p>
            <p className="text-2xl font-bold text-gray-800">{cost.tokens.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">预估成本</p>
            <p className="text-2xl font-bold text-gray-800">${cost.estimatedCost.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: 'green' | 'blue' | 'purple' | 'gray';
}

function MetricCard({ title, value, icon, color = 'gray' }: MetricCardProps) {
  const colors = {
    green: 'from-green-50 to-green-100 border-green-200',
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    gray: 'from-gray-50 to-gray-100 border-gray-200',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-4 shadow-sm border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}
