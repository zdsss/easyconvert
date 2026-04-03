import { useEffect } from 'react';
import { useApiStore } from '@lib/store/apiStore';
import MetricCard from '@components/ui/MetricCard';
import Icon from '@components/ui/Icon';

export default function ApiOverview() {
  const { overview, loadOverview, error } = useApiStore();

  useEffect(() => { loadOverview(); }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">API 概览</h1>
        <p className="text-sm text-text-secondary mt-1">API 服务状态和使用概况</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-status-warning-bg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <Icon name="alert-triangle" size={16} />
            <span>无法连接后端服务: {error}</span>
          </div>
        </div>
      )}

      {/* Tenant info */}
      <div className="card p-5 mb-6">
        <h3 className="section-title flex items-center gap-2 mb-4">
          <Icon name="shield" size={16} className="text-text-tertiary" />
          租户信息
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-surface-secondary rounded-lg">
            <p className="text-xs text-text-tertiary mb-1">租户 ID</p>
            <p className="text-text-primary font-mono font-medium">{overview?.tenantId || 'default'}</p>
          </div>
          <div className="p-3 bg-surface-secondary rounded-lg">
            <p className="text-xs text-text-tertiary mb-1">API 版本</p>
            <p className="text-text-primary font-medium">v1</p>
          </div>
          <div className="p-3 bg-surface-secondary rounded-lg">
            <p className="text-xs text-text-tertiary mb-1">状态</p>
            <p className="text-status-success font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-success" />
              正常
            </p>
          </div>
          <div className="p-3 bg-surface-secondary rounded-lg">
            <p className="text-xs text-text-tertiary mb-1">基础 URL</p>
            <p className="text-text-primary font-mono text-xs">/api/v1</p>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="活跃 Keys"
          value={overview?.activeKeys ?? 0}
          icon="key"
        />
        <MetricCard
          title="总请求数"
          value={overview?.totalRequests ?? 0}
          icon="globe"
          sparklineData={overview?.requestTrend?.map(d => d.count) || []}
        />
        <MetricCard
          title="限流使用率"
          value={`${overview?.rateLimitUsage?.toFixed(1) ?? 0}%`}
          icon="shield"
          color={overview && overview.rateLimitUsage > 80 ? 'text-status-error' : 'text-status-success'}
        />
        <MetricCard
          title="健康状态"
          value="正常"
          icon="check-circle"
          color="text-status-success"
        />
      </div>

      {/* Request trend */}
      <div className="card p-5 mb-6">
        <h3 className="section-title flex items-center gap-2 mb-4">
          <Icon name="trending-up" size={16} className="text-text-tertiary" />
          请求趋势（7天）
        </h3>
        {overview?.requestTrend && overview.requestTrend.length > 0 ? (
          <div className="space-y-2">
            {overview.requestTrend.map((d, i) => {
              const max = Math.max(...overview.requestTrend.map(t => t.count), 1);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-text-tertiary text-right">{d.date}</span>
                  <div className="flex-1 bg-surface-tertiary rounded-full h-5 overflow-hidden">
                    <div
                      className="h-5 bg-brand-500 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((d.count / max) * 100, 3)}%` }}
                    >
                      <span className="text-xs text-white font-medium">{d.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-8">暂无请求数据</p>
        )}
      </div>

      {/* Rate limit panel */}
      <div className="card p-5">
        <h3 className="section-title flex items-center gap-2 mb-4">
          <Icon name="shield" size={16} className="text-text-tertiary" />
          限流状态
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-surface-secondary rounded-lg text-center">
            <p className="text-xs text-text-secondary mb-1">限流上限</p>
            <p className="text-2xl font-bold font-mono text-text-primary">100</p>
            <p className="text-xs text-text-tertiary">请求/分钟</p>
          </div>
          <div className="p-4 bg-surface-secondary rounded-lg text-center">
            <p className="text-xs text-text-secondary mb-1">当前使用</p>
            <p className="text-2xl font-bold font-mono text-brand-600">{overview?.rateLimitUsage?.toFixed(0) ?? 0}%</p>
          </div>
          <div className="p-4 bg-surface-secondary rounded-lg text-center">
            <p className="text-xs text-text-secondary mb-1">剩余配额</p>
            <p className="text-2xl font-bold font-mono text-status-success">
              {100 - Math.round(overview?.rateLimitUsage ?? 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
