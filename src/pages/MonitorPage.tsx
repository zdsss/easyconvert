import { useEffect, useState, useCallback } from 'react';
import { useMonitoringStore } from '@lib/store/monitoringStore';
import MetricCard from '@components/ui/MetricCard';
import DistributionChart from '@components/DistributionChart';
import Icon from '@components/ui/Icon';
import PerformanceCard from '@components/PerformanceCard';
import CostCard from '@components/CostCard';
import AlertRulesSection from '@components/AlertRulesSection';
import type { AlertRule } from '@components/AlertRulesSection';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TIME_RANGES = [
  { label: '1小时', value: '1h' },
  { label: '24小时', value: '24h' },
  { label: '7天', value: '7d' },
] as const;

const DEFAULT_RULES: AlertRule[] = [
  { id: 'errorRate', type: 'errorRate', threshold: 10, enabled: false, label: '错误率', unit: '%' },
  { id: 'p95Latency', type: 'p95Latency', threshold: 3000, enabled: false, label: 'P95 延迟', unit: 'ms' },
  { id: 'dailyCost', type: 'dailyCost', threshold: 10, enabled: false, label: '日成本', unit: '¥' },
];

const STORAGE_KEY = 'easyconvert-alert-rules';

function AlertToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-status-error text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
      <Icon name="alert-triangle" size={16} />
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-auto opacity-70 hover:opacity-100">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

export default function MonitorPage() {
  const { metrics, cacheStats, performance, cost, history, sync } = useMonitoringStore();
  const [timeRange, setTimeRange] = useState<string>('24h');

  const [rules, setRules] = useState<AlertRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    } catch { return DEFAULT_RULES; }
  });

  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [firedAlerts, setFiredAlerts] = useState<Set<string>>(new Set());

  const updateRule = useCallback((id: string, updates: Partial<AlertRule>) => {
    setRules(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    sync();
    const interval = setInterval(sync, 5000);
    return () => clearInterval(interval);
  }, [sync]);

  useEffect(() => {
    if (!rules.some(r => r.enabled)) return;

    const errorRate = metrics.totalProcessed > 0
      ? ((metrics.totalProcessed - (metrics.totalProcessed * metrics.successRate / 100)) / metrics.totalProcessed) * 100
      : 0;

    const checks: Record<string, number> = {
      errorRate,
      p95Latency: performance.p95,
      dailyCost: cost.estimatedCost,
    };

    for (const rule of rules) {
      if (!rule.enabled) continue;
      const value = checks[rule.type];
      if (value !== undefined && value > rule.threshold) {
        const alertKey = `${rule.id}-${Math.floor(Date.now() / 60000)}`;
        if (!firedAlerts.has(alertKey)) {
          setFiredAlerts(prev => new Set([...prev, alertKey]));
          setToasts(prev => [...prev, {
            id: alertKey,
            message: `⚠️ ${rule.label} 超阈值：当前 ${value.toFixed(1)}${rule.unit}，阈值 ${rule.threshold}${rule.unit}`,
          }]);
        }
      }
    }
  }, [metrics, performance, cost]);

  // Filter history by time range
  const timeRangeMs: Record<string, number> = { '1h': 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000 };
  const cutoff = Date.now() - (timeRangeMs[timeRange] || timeRangeMs['24h']);
  const filteredHistory = history.filter(h => h.timestamp >= cutoff);
  const displayHistory = filteredHistory.length > 0 ? filteredHistory : history;

  const processedSparkline = displayHistory.map(h => h.totalProcessed);
  const successRateSparkline = displayHistory.map(h => h.successRate);
  const cacheRateSparkline = displayHistory.map(h => h.cacheHitRate);
  const avgTimeSparkline = displayHistory.map(h => h.avgTime / 1000);

  const trendData = displayHistory.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    count: h.totalProcessed,
    successRate: Math.round(h.successRate * 10) / 10,
  }));

  const cacheHitData = { '命中': cacheStats.hits, '未命中': cacheStats.misses };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">监控仪表盘</h1>
          <p className="text-sm text-text-secondary mt-1">实时系统指标和性能数据</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-tertiary rounded-lg p-0.5">
            {TIME_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeRange === r.value
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={sync} className="btn-ghost p-2" title="刷新">
            <Icon name="refresh" size={16} />
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="总处理数" value={metrics.totalProcessed} icon="layers" sparklineData={processedSparkline} />
        <MetricCard
          title="成功率" value={`${metrics.successRate.toFixed(1)}%`} icon="check-circle" color="text-status-success"
          trend={displayHistory.length >= 2 ? {
            value: Math.round((displayHistory[displayHistory.length - 1].successRate - displayHistory[0].successRate) * 10) / 10,
            direction: displayHistory[displayHistory.length - 1].successRate >= displayHistory[0].successRate ? 'up' : 'down',
          } : undefined}
          sparklineData={successRateSparkline}
        />
        <MetricCard title="缓存命中率" value={`${metrics.cacheHitRate.toFixed(1)}%`} icon="zap" color="text-status-info" sparklineData={cacheRateSparkline} />
        <MetricCard
          title="平均耗时" value={`${(metrics.avgTime / 1000).toFixed(2)}s`} icon="clock" color="text-status-warning"
          trend={displayHistory.length >= 2 ? {
            value: Math.round(((displayHistory[displayHistory.length - 1].avgTime - displayHistory[0].avgTime) / Math.max(displayHistory[0].avgTime, 1)) * -100 * 10) / 10,
            direction: displayHistory[displayHistory.length - 1].avgTime <= displayHistory[0].avgTime ? 'up' : 'down',
          } : undefined}
          sparklineData={avgTimeSparkline}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="section-title flex items-center gap-2 mb-4">
            <Icon name="activity" size={16} className="text-text-tertiary" />
            处理趋势
          </h3>
          <div style={{ height: 280 }}>
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="[&>line]:stroke-border" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} className="[&_text]:fill-text-tertiary" />
                  <YAxis tick={{ fontSize: 11 }} className="[&_text]:fill-text-tertiary" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [
                      name === 'count' ? value : `${value}%`,
                      name === 'count' ? '处理数' : '成功率',
                    ]}
                  />
                  <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                数据采集中，请稍候...
              </div>
            )}
          </div>
        </div>

        {/* Cache donut */}
        <div className="card p-5">
          <h3 className="section-title flex items-center gap-2 mb-4">
            <Icon name="pie-chart" size={16} className="text-text-tertiary" />
            缓存命中率
          </h3>
          <div style={{ height: 220 }}>
            <DistributionChart data={cacheHitData} title="缓存" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="p-3 bg-status-success-bg dark:bg-emerald-900/20 rounded-lg text-center">
              <p className="text-xs text-text-secondary">命中</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{cacheStats.hits}</p>
            </div>
            <div className="p-3 bg-status-error/10 rounded-lg text-center">
              <p className="text-xs text-text-secondary">未命中</p>
              <p className="text-lg font-bold text-status-error">{cacheStats.misses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance + Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <PerformanceCard performance={performance} />
        <CostCard cost={cost} />
      </div>

      <AlertRulesSection rules={rules} onUpdate={updateRule} />

      {toasts.map(toast => (
        <AlertToast
          key={toast.id}
          message={toast.message}
          onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
        />
      ))}
    </div>
  );
}
