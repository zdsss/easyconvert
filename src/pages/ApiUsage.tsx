import { useEffect, useState } from 'react';
import { useApiStore } from '@lib/store/apiStore';
import MetricCard from '@components/ui/MetricCard';
import TrendChart from '@components/TrendChart';
import Icon from '@components/ui/Icon';

const TIME_RANGES = [
  { label: '7天', value: 7 },
  { label: '14天', value: 14 },
  { label: '30天', value: 30 },
] as const;

export default function ApiUsage() {
  const { usage, loadUsage, error } = useApiStore();
  const [days, setDays] = useState(7);

  useEffect(() => { loadUsage(undefined, days); }, [days]);

  const handleExportCSV = () => {
    if (!usage) return;
    const rows = [
      ['端点', '请求数', '平均延迟(ms)'],
      ...(usage.requestsByEndpoint || []).map(e => [e.endpoint, String(e.count), String(e.avgLatency)]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-usage-${days}d.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">用量统计</h1>
          <p className="text-sm text-text-secondary mt-1">API 请求量、延迟和端点统计</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-tertiary rounded-lg p-0.5">
            {TIME_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  days === r.value
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2" disabled={!usage}>
            <Icon name="download" size={16} />
            CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-status-warning-bg border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Icon name="alert-triangle" size={16} />
          无法加载用量数据: {error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="总请求数" value={usage?.totalRequests ?? 0} icon="globe"
          sparklineData={usage?.requestsByDay?.map(d => d.count) || []} />
        <MetricCard title="成功率" value={`${(usage?.successRate ?? 0).toFixed(1)}%`} icon="check-circle"
          color="text-status-success" />
        <MetricCard title="平均延迟" value={`${(usage?.avgLatency ?? 0).toFixed(0)}ms`} icon="clock"
          color="text-status-warning" />
        <MetricCard title="总 Token" value={(usage?.totalTokens ?? 0).toLocaleString()} icon="hash" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Request trend */}
        <div className="card p-5">
          <h3 className="section-title flex items-center gap-2 mb-4">
            <Icon name="trending-up" size={16} className="text-text-tertiary" />
            请求趋势
          </h3>
          <div style={{ height: 200 }}>
            {usage?.requestsByDay && usage.requestsByDay.length > 0 ? (
              <TrendChart
                data={usage.requestsByDay}
                dataKey="count"
                xKey="date"
                yDomain={['auto', 'auto']}
                color="#3b82f6"
                tooltipFormatter={(value) => [String(value), '请求数']}
              />
            ) : (
              <p className="text-sm text-text-secondary text-center py-8">暂无数据</p>
            )}
          </div>
        </div>

        {/* Latency distribution */}
        <div className="card p-5">
          <h3 className="section-title flex items-center gap-2 mb-4">
            <Icon name="bar-chart" size={16} className="text-text-tertiary" />
            延迟分布
          </h3>
          {usage?.latencyDistribution && usage.latencyDistribution.length > 0 ? (
            <div className="space-y-2">
              {usage.latencyDistribution.map((d, i) => {
                const max = Math.max(...usage.latencyDistribution.map(t => t.count), 1);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-text-tertiary text-right">{d.bucket}</span>
                    <div className="flex-1 bg-surface-tertiary rounded-full h-5 overflow-hidden">
                      <div
                        className="h-5 bg-status-info rounded-full flex items-center justify-end pr-2"
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
            <p className="text-sm text-text-secondary text-center py-8">暂无数据</p>
          )}
        </div>
      </div>

      {/* Endpoint stats table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="section-title flex items-center gap-2">
            <Icon name="server" size={16} className="text-text-tertiary" />
            端点统计
          </h3>
        </div>
        {usage?.requestsByEndpoint && usage.requestsByEndpoint.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">端点</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">请求数</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">平均延迟</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">占比</th>
                </tr>
              </thead>
              <tbody>
                {usage.requestsByEndpoint.map((e, i) => {
                  const total = usage.requestsByEndpoint.reduce((s, x) => s + x.count, 0) || 1;
                  const pct = (e.count / total) * 100;
                  return (
                    <tr key={i} className="border-t border-border-light">
                      <td className="px-5 py-3 font-mono text-xs text-text-primary">{e.endpoint}</td>
                      <td className="px-5 py-3 font-mono text-text-primary">{e.count}</td>
                      <td className="px-5 py-3 font-mono text-text-secondary">{e.avgLatency}ms</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-text-tertiary">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-8">暂无端点数据</p>
        )}
      </div>
    </div>
  );
}
