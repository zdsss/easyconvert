import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import TrendChart from '@components/TrendChart';
import DistributionChart from '@components/DistributionChart';
import AccuracyHeatmap from '@components/AccuracyHeatmap';
import MetricCard from '@components/ui/MetricCard';
import Icon from '@components/ui/Icon';
import Skeleton from '@components/ui/Skeleton';
import { exportReportToPdf } from '@lib/export/reportToPdf';

interface TrendPoint { date: string; accuracy: number; count: number; }
interface Distribution { difficulty: Record<string, number>; completeness: Record<string, number>; scenario: Record<string, number>; }
interface CostData { totalFiles: number; cachedFiles: number; totalTokens: number; estimatedCost: number; avgTokensPerFile: number; avgProcessingTime: number; }
interface ErrorPattern { field: string; count: number; type: string; }

const TABS = [
  { key: 'trends', label: '趋势分析', icon: 'trending-up' },
  { key: 'distribution', label: '分布分析', icon: 'pie-chart' },
  { key: 'accuracy', label: '准确率热力图', icon: 'grid' },
  { key: 'errors', label: '错误分析', icon: 'alert-triangle' },
  { key: 'cost', label: '成本分析', icon: 'zap' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [errors, setErrors] = useState<ErrorPattern[]>([]);
  const [cost, setCost] = useState<CostData | null>(null);
  const [fieldAccuracy, setFieldAccuracy] = useState<Record<string, { accuracy: number; matchType: string }>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('trends');

  useEffect(() => { if (id) loadReportData(id); }, [id]);

  const loadReportData = async (taskId: string) => {
    setLoading(true);
    try {
      const [trendsRes, distRes, errorsRes, costRes, resultsRes] = await Promise.all([
        fetch('/api/reports/trends').then(r => r.json()),
        fetch(`/api/reports/distribution/${taskId}`).then(r => r.json()),
        fetch(`/api/reports/errors/${taskId}`).then(r => r.json()),
        fetch(`/api/reports/cost/${taskId}`).then(r => r.json()),
        fetch(`/api/evaluations/${taskId}/results`).then(r => r.ok ? r.json() : []),
      ]);
      setTrends(trendsRes);
      setDistribution(distRes);
      setErrors(errorsRes);
      setCost(costRes);

      // Aggregate field-level accuracy from results
      if (Array.isArray(resultsRes) && resultsRes.length > 0) {
        const fieldMap: Record<string, { total: number; count: number }> = {};
        for (const result of resultsRes) {
          if (result.metrics?.fieldMetrics) {
            for (const [field, data] of Object.entries(result.metrics.fieldMetrics as Record<string, { accuracy?: number }>)) {
              if (!fieldMap[field]) fieldMap[field] = { total: 0, count: 0 };
              fieldMap[field].total += data.accuracy ?? 0;
              fieldMap[field].count += 1;
            }
          }
        }
        const aggregated: Record<string, { accuracy: number; matchType: string }> = {};
        for (const [field, { total, count }] of Object.entries(fieldMap)) {
          aggregated[field] = { accuracy: total / count, matchType: 'avg' };
        }
        // Fallback: derive from overall metrics if no field-level data
        if (Object.keys(aggregated).length === 0) {
          const fields = ['basics.name', 'basics.email', 'basics.phone', 'basics.title', 'basics.location', 'work[0].company', 'work[0].position', 'education[0].institution', 'education[0].degree', 'skills'];
          const avgAccuracy = resultsRes.reduce((s: number, r: { metrics?: { accuracy?: number } }) => s + (r.metrics?.accuracy ?? 0), 0) / resultsRes.length;
          for (const f of fields) {
            aggregated[f] = { accuracy: avgAccuracy, matchType: 'avg' };
          }
        }
        setFieldAccuracy(aggregated);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleExportPDF = () => {
    exportReportToPdf({ trends, distribution, errors, cost, fieldAccuracy });
  };

  if (loading) return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" variant="rectangular" />)}
      </div>
      <Skeleton className="h-64 w-full" variant="rectangular" />
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to={`/evaluation/${id}`} className="btn-ghost p-1.5">
            <Icon name="arrow-left" size={18} />
          </Link>
          <h1 className="page-title">评测报告</h1>
        </div>
        <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2">
          <Icon name="download" size={16} />
          导出 PDF
        </button>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="总文件数" value={cost?.totalFiles || 0} icon="file-text" />
        <MetricCard title="缓存命中" value={cost?.cachedFiles || 0} icon="zap" color="text-status-success" />
        <MetricCard title="总 Token" value={cost?.totalTokens?.toLocaleString() || '0'} icon="hash" />
        <MetricCard title="预估成本" value={`¥${cost?.estimatedCost?.toFixed(6) || '0'}`} icon="bar-chart" color="text-status-warning" />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border mb-5">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Trends */}
      {activeTab === 'trends' && (
        <div className="card p-5">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Icon name="activity" size={16} className="text-text-tertiary" />
            准确率趋势
          </h2>
          <div style={{ height: 320 }}>
            <TrendChart data={trends} />
          </div>
        </div>
      )}

      {/* Tab: Distribution */}
      {activeTab === 'distribution' && distribution && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'difficulty', title: '难度分布', data: distribution.difficulty },
            { key: 'completeness', title: '完整度分布', data: distribution.completeness },
            { key: 'scenario', title: '场景分布', data: distribution.scenario },
          ].map(({ key, title, data }) => (
            <div key={key} className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">{title}</h3>
              <div style={{ height: 240 }}>
                <DistributionChart data={data} title={title} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Accuracy Heatmap */}
      {activeTab === 'accuracy' && (
        <div className="card p-5">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Icon name="grid" size={16} className="text-text-tertiary" />
            字段准确率热力图
          </h2>
          {Object.keys(fieldAccuracy).length > 0 ? (
            <AccuracyHeatmap fields={fieldAccuracy} />
          ) : (
            <div className="text-center py-12 text-text-secondary">
              <Icon name="grid" size={40} className="mx-auto mb-3 text-text-tertiary" />
              <p>暂无字段级准确率数据</p>
              <p className="text-sm text-text-tertiary mt-1">需要启用字段级评测后才能显示热力图</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Errors */}
      {activeTab === 'errors' && (
        errors.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="section-title flex items-center gap-2">
                <Icon name="alert-triangle" size={16} className="text-text-tertiary" />
                字段缺失分析 Top {errors.length}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">字段</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">缺失次数</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">类型</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">占比</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((e, i) => {
                    const maxCount = errors[0]?.count || 1;
                    const pct = (e.count / maxCount) * 100;
                    return (
                      <tr key={i} className="border-t border-border-light">
                        <td className="px-5 py-3 font-mono text-xs text-text-primary">{e.field}</td>
                        <td className="px-5 py-3 text-text-primary">{e.count}</td>
                        <td className="px-5 py-3"><span className="badge-error">{e.type}</span></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                              <div className="h-full bg-status-error rounded-full" style={{ width: `${pct}%` }} />
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
          </div>
        ) : (
          <div className="text-center py-12 text-text-secondary">
            <Icon name="check-circle" size={40} className="mx-auto mb-3 text-status-success" />
            <p>无错误数据</p>
          </div>
        )
      )}

      {/* Tab: Cost */}
      {activeTab === 'cost' && cost && (
        <div className="card p-5">
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Icon name="zap" size={16} className="text-text-tertiary" />
            成本分析
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface-secondary rounded-lg text-center">
              <div className="text-xs text-text-secondary mb-1">总文件数</div>
              <div className="text-2xl font-bold font-mono text-text-primary">{cost.totalFiles}</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg text-center">
              <div className="text-xs text-text-secondary mb-1">缓存命中</div>
              <div className="text-2xl font-bold font-mono text-status-success">{cost.cachedFiles}</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg text-center">
              <div className="text-xs text-text-secondary mb-1">总 Token</div>
              <div className="text-2xl font-bold font-mono text-text-primary">{cost.totalTokens.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg text-center">
              <div className="text-xs text-text-secondary mb-1">平均 Token/文件</div>
              <div className="text-2xl font-bold font-mono text-text-primary">{cost.avgTokensPerFile.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg text-center">
              <div className="text-xs text-text-secondary mb-1">平均处理时间</div>
              <div className="text-2xl font-bold font-mono text-status-info">{(cost.avgProcessingTime / 1000).toFixed(2)}s</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg text-center">
              <div className="text-xs text-text-secondary mb-1">预估成本</div>
              <div className="text-2xl font-bold font-mono text-status-warning">¥{cost.estimatedCost.toFixed(6)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
