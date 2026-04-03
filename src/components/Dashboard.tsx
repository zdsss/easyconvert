import { useEffect } from 'react';
import { useMonitoringStore } from '@lib/store/monitoringStore';
import Icon from './ui/Icon';

export default function Dashboard() {
  const { metrics, cacheStats, performance, cost, sync } = useMonitoringStore();

  useEffect(() => {
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, [sync]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">监控仪表盘</h1>
        <p className="text-sm text-gray-500 mt-1">实时系统指标和性能数据</p>
      </div>

      {/* Metrics overview */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard title="总处理数" value={metrics.totalProcessed} icon="layers" />
        <MetricCard title="成功率" value={`${metrics.successRate.toFixed(1)}%`} icon="check-circle" color="success" />
        <MetricCard title="缓存命中率" value={`${metrics.cacheHitRate.toFixed(1)}%`} icon="zap" color="info" />
        <MetricCard title="平均耗时" value={`${(metrics.avgTime / 1000).toFixed(2)}s`} icon="clock" color="warning" />
      </div>

      {/* Performance */}
      <div className="card p-5 mb-6">
        <h3 className="section-title flex items-center gap-2 mb-4">
          <Icon name="activity" size={16} className="text-gray-400" />
          性能指标
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <LatencyCard label="P50 延迟" value={performance.p50} />
          <LatencyCard label="P95 延迟" value={performance.p95} />
          <LatencyCard label="P99 延迟" value={performance.p99} />
        </div>
      </div>

      {/* Cache analysis */}
      <div className="card p-5 mb-6">
        <h3 className="section-title flex items-center gap-2 mb-4">
          <Icon name="folder" size={16} className="text-gray-400" />
          缓存分析
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-2">命中 vs 未命中</p>
            <div className="flex gap-3">
              <div className="flex-1 p-4 bg-status-success-bg rounded-lg text-center">
                <p className="text-xs text-gray-500">命中</p>
                <p className="text-xl font-bold text-emerald-700">{cacheStats.hits}</p>
              </div>
              <div className="flex-1 p-4 bg-status-error-bg rounded-lg text-center">
                <p className="text-xs text-gray-500">未命中</p>
                <p className="text-xl font-bold text-red-700">{cacheStats.misses}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">平均查询时间</p>
            <div className="flex gap-3">
              <div className="flex-1 p-4 bg-status-info-bg rounded-lg text-center">
                <p className="text-xs text-gray-500">命中</p>
                <p className="text-xl font-bold text-blue-700">{cacheStats.avgHitTime.toFixed(1)}ms</p>
              </div>
              <div className="flex-1 p-4 bg-status-warning-bg rounded-lg text-center">
                <p className="text-xs text-gray-500">未命中</p>
                <p className="text-xl font-bold text-amber-700">{cacheStats.avgMissTime.toFixed(1)}ms</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost tracker */}
      <div className="card p-5">
        <h3 className="section-title flex items-center gap-2 mb-4">
          <Icon name="bar-chart" size={16} className="text-gray-400" />
          成本追踪
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 bg-surface-secondary rounded-lg">
            <p className="text-xs text-gray-500 mb-1">API 调用</p>
            <p className="text-2xl font-bold text-gray-900">{cost.calls}</p>
          </div>
          <div className="p-4 bg-surface-secondary rounded-lg">
            <p className="text-xs text-gray-500 mb-1">总 Token</p>
            <p className="text-2xl font-bold text-gray-900">{cost.tokens.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-surface-secondary rounded-lg">
            <p className="text-xs text-gray-500 mb-1">预估成本</p>
            <p className="text-2xl font-bold text-gray-900">${cost.estimatedCost.toFixed(2)}</p>
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
  color?: 'success' | 'info' | 'warning';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorMap = {
    success: 'text-status-success',
    info: 'text-status-info',
    warning: 'text-status-warning',
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-surface-tertiary flex items-center justify-center">
          <Icon name={icon} size={16} className="text-gray-500" />
        </div>
      </div>
      <p className="text-xs text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${color ? colorMap[color] : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function LatencyCard({ label, value }: { label: string; value: number }) {
  const color = value < 500 ? 'text-status-success' : value < 2000 ? 'text-status-warning' : 'text-status-error';
  return (
    <div className="p-4 bg-surface-secondary rounded-lg">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}ms</p>
    </div>
  );
}
