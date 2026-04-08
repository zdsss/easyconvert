import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvaluationStore, type EvaluationTask } from '@lib/store/evaluationStore';
import { evaluationApi } from '@lib/api/evaluationApi';
import { logger } from '@lib/logger';
import { processWithEvaluation } from '@lib/evaluationProcessor';
import { generateReport, exportToCSV } from '@lib/reportGenerator';
import EvaluationResultDrawer from '@components/EvaluationResultDrawer';
import ComparisonView from '@components/ComparisonView';
import MetricCard from '@components/ui/MetricCard';
import Pagination from '@components/ui/Pagination';
import Icon from '@components/ui/Icon';
import type { TaskResponse, EvaluationResult, Resume } from '@lib/types';

function adaptTaskResponse(task: TaskResponse): EvaluationTask {
  return {
    ...task,
    type: (task.type as 'single' | 'batch') || 'single',
    config: task.config || { enableFieldLevel: false, enableClassification: false, enableProcessTrace: false, accuracyMethod: 'exact' as const },
    stats: task.stats || { totalFiles: 0, processedFiles: 0, successCount: 0, failureCount: 0 },
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt || task.createdAt)
  };
}

function LanguageBadge({ lang }: { lang?: string }) {
  if (!lang || lang === 'unknown') return null;
  const map: Record<string, { label: string; cls: string }> = {
    zh: { label: 'ZH', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    en: { label: 'EN', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    ja: { label: 'JA', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  };
  const { label, cls } = map[lang] ?? { label: lang.toUpperCase(), cls: 'bg-surface-secondary text-text-secondary' };
  return <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${cls}`}>{label}</span>;
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  completed: { label: '已完成', class: 'badge-success' },
  processing: { label: '处理中', class: 'badge-info' },
  failed: { label: '失败', class: 'badge-error' },
  pending: { label: '待评测', class: 'badge-neutral' },
};

const TABS = [
  { key: 'results', label: '结果列表', icon: 'list' },
  { key: 'upload', label: '文件上传', icon: 'upload' },
  { key: 'config', label: '配置信息', icon: 'settings' },
] as const;

type TabKey = typeof TABS[number]['key'];
const PAGE_SIZE = 10;

export default function EvaluationDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentTask, results, setCurrentTask, setResults, isLoading, setLoading } = useEvaluationStore();
  const [files, setFiles] = useState<FileList | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [running, setRunning] = useState(false);
  const [selectedResult, setSelectedResult] = useState<EvaluationResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<TabKey>('results');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'fileName' | 'accuracy' | 'processingTime'>('fileName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (id) loadTaskAndResults(id);
  }, [id]);

  const loadTaskAndResults = async (taskId: string) => {
    setLoading(true);
    try {
      const [task, taskResults] = await Promise.all([
        evaluationApi.getTask(taskId),
        evaluationApi.getResults(taskId)
      ]);
      setCurrentTask(adaptTaskResponse(task));
      setResults(taskResults);
    } catch (error: unknown) {
      logger.error('Failed to load data', error instanceof Error ? error : new Error(String(error)));
      setCurrentTask({
        id: id!, name: '评测任务', type: 'batch', status: 'pending',
        config: { enableFieldLevel: true, enableClassification: true, enableProcessTrace: false, accuracyMethod: 'partial' },
        stats: { totalFiles: 0, processedFiles: 0, successCount: 0, failureCount: 0 },
        createdAt: new Date(), updatedAt: new Date()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = async () => {
    if (!files || !currentTask) return;
    setRunning(true);
    setResults([]);
    setActiveTab('results');
    const fileArray = Array.from(files);
    setProgress({ current: 0, total: fileArray.length });

    try {
      const annotations = await loadGroundTruth();
      await processWithEvaluation(fileArray, {
        taskId: currentTask.id,
        enableFieldLevel: currentTask.config.enableFieldLevel,
        enableClassification: currentTask.config.enableClassification,
        enableProcessTrace: currentTask.config.enableProcessTrace,
        accuracyMethod: currentTask.config.accuracyMethod,
        annotations
      }, (current, total) => setProgress({ current, total }));
      const updatedResults = await evaluationApi.getResults(currentTask.id);
      setResults(updatedResults);
      setCurrentTask({ ...currentTask, status: 'completed' });
    } catch (error: unknown) {
      logger.error('Evaluation failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setRunning(false);
    }
  };

  async function loadGroundTruth(): Promise<Map<string, Resume> | undefined> {
    try {
      const response = await fetch('/test-resumes/ground-truth.json');
      if (!response.ok) return undefined;
      const data = await response.json();
      return new Map(Object.entries(data));
    } catch { return undefined; }
  }

  const handleRetryFailed = async () => {
    if (!currentTask) return;
    setRetrying(true);
    try {
      await evaluationApi.retryFailed(currentTask.id);
      await loadTaskAndResults(currentTask.id);
    } catch (error: unknown) {
      logger.error('Failed to retry', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setRetrying(false);
    }
  };

  const handleSaveAnnotation = async (annotation: unknown) => {
    if (!selectedResult || !currentTask) return;
    try {
      await evaluationApi.saveAnnotation(currentTask.id, selectedResult.id, annotation as Resume);
      const updatedResults = await evaluationApi.getResults(currentTask.id);
      setResults(updatedResults);
      setSelectedResult(null);
    } catch (error: unknown) {
      logger.error('Failed to save annotation', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleExportReport = (format: 'json' | 'csv') => {
    if (!currentTask || results.length === 0) return;
    const report = generateReport(currentTask, results);
    const content = format === 'json' ? JSON.stringify(report, null, 2) : exportToCSV(report);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${currentTask.id}.${format}`;
    a.click();
  };

  if (isLoading) return (
    <div className="p-6 flex items-center gap-2 text-text-secondary">
      <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      加载中...
    </div>
  );
  if (!currentTask) return <div className="p-6 text-text-secondary">任务不存在</div>;

  // Filter & sort results
  let filteredResults = statusFilter === 'all' ? results
    : statusFilter === 'success' ? results.filter(r => !r.error)
    : statusFilter === 'failed' ? results.filter(r => r.error)
    : results.filter(r => r.fromCache);

  filteredResults = [...filteredResults].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'fileName') cmp = a.fileName.localeCompare(b.fileName);
    else if (sortField === 'accuracy') cmp = (a.metrics?.accuracy || 0) - (b.metrics?.accuracy || 0);
    else cmp = a.processingTime - b.processingTime;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalItems = filteredResults.length;
  const paginatedResults = filteredResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const overallMetrics = results.length > 0 ? {
    accuracy: results.reduce((sum, r) => sum + r.metrics.accuracy, 0) / results.length,
    completeness: results.reduce((sum, r) => sum + r.metrics.completeness, 0) / results.length,
    structureScore: results.reduce((sum, r) => sum + r.metrics.structureScore, 0) / results.length,
    avgTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
    cacheRate: (results.filter(r => r.fromCache).length / results.length) * 100,
  } : null;

  const statusInfo = STATUS_MAP[currentTask.status] || STATUS_MAP.pending;

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    sortField === field ? <Icon name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} /> : null
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Task header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/evaluation" className="btn-ghost p-1.5">
            <Icon name="arrow-left" size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="page-title">{currentTask.name}</h1>
              <span className={statusInfo.class}>{statusInfo.label}</span>
            </div>
            {currentTask.description && (
              <p className="text-sm text-text-secondary mt-0.5">{currentTask.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentTask.stats.failureCount > 0 && (
            <button
              onClick={handleRetryFailed}
              disabled={retrying}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <Icon name="refresh-cw" size={14} className={retrying ? 'animate-spin' : ''} />
              {retrying ? '重试中...' : '重试失败'}
            </button>
          )}
          {results.length > 0 && (
            <>
              <button onClick={() => handleExportReport('json')} className="btn-ghost text-xs flex items-center gap-1.5">
                <Icon name="download" size={14} /> JSON
              </button>
              <button onClick={() => handleExportReport('csv')} className="btn-ghost text-xs flex items-center gap-1.5">
                <Icon name="download" size={14} /> CSV
              </button>
              <Link to={`/evaluation/${id}/report`} className="btn-secondary flex items-center gap-2">
                <Icon name="bar-chart" size={16} /> 报告
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Metric cards */}
      {overallMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <MetricCard title="平均准确率" value={`${overallMetrics.accuracy.toFixed(1)}%`} icon="check-circle" color="text-brand-600" />
          <MetricCard title="平均完整度" value={`${overallMetrics.completeness.toFixed(1)}%`} icon="layers" color="text-status-success" />
          <MetricCard title="结构分" value={`${overallMetrics.structureScore.toFixed(1)}%`} icon="grid" color="text-purple-600" />
          <MetricCard title="平均耗时" value={`${(overallMetrics.avgTime / 1000).toFixed(2)}s`} icon="clock" color="text-status-warning" />
          <MetricCard title="缓存率" value={`${overallMetrics.cacheRate.toFixed(0)}%`} icon="zap" color="text-status-info" />
        </div>
      )}

      {/* Progress bar */}
      {running && (
        <div className="card p-4 mb-6">
          <div className="flex justify-between text-sm text-text-secondary mb-2">
            <span>处理进度</span>
            <span>{progress.current}/{progress.total} ({progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%)</span>
          </div>
          <div className="w-full bg-surface-tertiary rounded-full h-2">
            <div className="bg-brand-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

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
            {tab.key === 'results' && results.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-surface-tertiary text-xs">{results.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Results */}
      {activeTab === 'results' && (
        <>
          {results.length > 0 && (
            <div className="flex gap-1.5 mb-4 flex-wrap items-center">
              {['all', 'success', 'failed', 'cached'].map(filter => (
                <button
                  key={filter}
                  onClick={() => { setStatusFilter(filter); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors duration-150 ${
                    statusFilter === filter
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-surface text-text-secondary border border-border hover:bg-surface-tertiary'
                  }`}
                >
                  {filter === 'all' ? `全部 (${results.length})` :
                   filter === 'success' ? `成功 (${results.filter(r => !r.error).length})` :
                   filter === 'failed' ? `失败 (${results.filter(r => r.error).length})` :
                   `缓存 (${results.filter(r => r.fromCache).length})`}
                </button>
              ))}
              {selectedRows.size === 2 && (
                <button
                  onClick={() => setShowComparison(true)}
                  className="ml-auto btn-secondary flex items-center gap-1.5 text-sm"
                >
                  <Icon name="columns" size={15} />
                  对比选中
                </button>
              )}
              {selectedRows.size > 0 && selectedRows.size !== 2 && (
                <span className="ml-auto text-xs text-text-tertiary">已选 {selectedRows.size} 行（选 2 行可对比）</span>
              )}
            </div>
          )}

          {paginatedResults.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-secondary">
                    <tr>
                      <th className="px-4 py-3 w-8" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer select-none" onClick={() => toggleSort('fileName')}>
                        <span className="flex items-center gap-1">文件名 <SortIcon field="fileName" /></span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer select-none" onClick={() => toggleSort('accuracy')}>
                        <span className="flex items-center gap-1">准确率 <SortIcon field="accuracy" /></span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">完整度</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer select-none" onClick={() => toggleSort('processingTime')}>
                        <span className="flex items-center gap-1">耗时 <SortIcon field="processingTime" /></span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedResults.map(result => (
                      <tr
                        key={result.id}
                        className={`border-t border-border-light hover:bg-surface-secondary cursor-pointer transition-colors ${selectedRows.has(result.id) ? 'bg-brand-50 dark:bg-brand-900/10' : ''}`}
                        onClick={() => setSelectedResult(result)}
                      >
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(result.id)}
                            onChange={e => {
                              const next = new Set(selectedRows);
                              if (e.target.checked) {
                                if (next.size < 2) next.add(result.id);
                              } else {
                                next.delete(result.id);
                              }
                              setSelectedRows(next);
                            }}
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-text-primary">
                          <div className="flex items-center gap-2">
                            {result.fileName}
                            <LanguageBadge lang={result.parsedResume?.additional?.language} />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono">{result.error ? '-' : `${result.metrics.accuracy.toFixed(1)}%`}</td>
                        <td className="px-4 py-3 font-mono">{result.error ? '-' : `${result.metrics.completeness.toFixed(1)}%`}</td>
                        <td className="px-4 py-3 text-text-secondary font-mono">{result.processingTime}ms</td>
                        <td className="px-4 py-3">
                          {result.error ? <span className="badge-error">失败</span>
                            : result.fromCache ? <span className="badge-neutral">缓存</span>
                            : <span className="badge-success">完成</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 border-t border-border">
                <Pagination currentPage={currentPage} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <Icon name="clipboard" size={40} className="mx-auto mb-3 text-text-tertiary" />
              <p>暂无结果，请上传文件并开始评测</p>
            </div>
          ) : null}
        </>
      )}

      {/* Tab: Upload */}
      {activeTab === 'upload' && (
        <div className="card p-6">
          <h3 className="section-title flex items-center gap-2 mb-4">
            <Icon name="upload" size={16} className="text-text-tertiary" />
            上传简历文件
          </h3>
          <p className="text-sm text-text-secondary mb-3">拖拽文件到此处，或点击选择文件</p>
          <div className="flex items-center gap-3">
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFiles(e.target.files)}
              className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-400"
              disabled={running}
            />
            <button
              onClick={handleStartEvaluation}
              disabled={!files || running}
              className="btn-primary flex items-center gap-2"
            >
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {progress.current}/{progress.total}
                </>
              ) : (
                <>
                  <Icon name="zap" size={16} />
                  开始评测
                </>
              )}
            </button>
          </div>
          {files && <p className="text-xs text-text-tertiary mt-2">已选择 {files.length} 个文件</p>}
        </div>
      )}

      {/* Tab: Config */}
      {activeTab === 'config' && (
        <div className="card p-6 space-y-4">
          <h3 className="section-title">配置信息</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-surface-secondary rounded-lg">
              <p className="text-xs text-text-tertiary mb-1">任务类型</p>
              <p className="text-text-primary font-medium">{currentTask.type === 'batch' ? '批量' : '单文件'}</p>
            </div>
            <div className="p-3 bg-surface-secondary rounded-lg">
              <p className="text-xs text-text-tertiary mb-1">准确率方法</p>
              <p className="text-text-primary font-medium">{currentTask.config.accuracyMethod}</p>
            </div>
            <div className="p-3 bg-surface-secondary rounded-lg">
              <p className="text-xs text-text-tertiary mb-1">字段级准确率</p>
              <p className="text-text-primary font-medium">{currentTask.config.enableFieldLevel ? '启用' : '禁用'}</p>
            </div>
            <div className="p-3 bg-surface-secondary rounded-lg">
              <p className="text-xs text-text-tertiary mb-1">分类</p>
              <p className="text-text-primary font-medium">{currentTask.config.enableClassification ? '启用' : '禁用'}</p>
            </div>
            <div className="p-3 bg-surface-secondary rounded-lg">
              <p className="text-xs text-text-tertiary mb-1">处理追踪</p>
              <p className="text-text-primary font-medium">{currentTask.config.enableProcessTrace ? '启用' : '禁用'}</p>
            </div>
            <div className="p-3 bg-surface-secondary rounded-lg">
              <p className="text-xs text-text-tertiary mb-1">创建时间</p>
              <p className="text-text-primary font-medium">{currentTask.createdAt.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Comparison modal */}
      {showComparison && (() => {
        const [idA, idB] = Array.from(selectedRows);
        const resultA = results.find(r => r.id === idA);
        const resultB = results.find(r => r.id === idB);
        if (!resultA || !resultB || !resultA.parsedResume || !resultB.parsedResume) return null;
        // If resultA has annotation, compare parsed vs annotation; otherwise compare two parsed resumes
        const useAnnotation = !!(resultA.annotation);
        const leftResume = resultA.parsedResume;
        const rightResume = (useAnnotation ? resultA.annotation : resultB.parsedResume)!;
        const leftLabel = resultA.fileName;
        const rightLabel = useAnnotation ? `${resultA.fileName} (标注)` : resultB.fileName;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowComparison(false)} />
            <div className="relative bg-surface rounded-xl border border-border shadow-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto animate-scale-in p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title">结果对比</h3>
                <button onClick={() => setShowComparison(false)} className="btn-ghost p-1.5">
                  <Icon name="x" size={18} />
                </button>
              </div>
              <div className="flex gap-4 mb-4 text-sm">
                <div className="flex-1 p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-700 dark:text-brand-400 font-medium truncate">{leftLabel}</div>
                <div className="flex-1 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-700 dark:text-emerald-400 font-medium truncate">{rightLabel}</div>
              </div>
              <ComparisonView parsed={leftResume} annotation={rightResume} />
            </div>
          </div>
        );
      })()}

      {/* Result Drawer */}
      <EvaluationResultDrawer
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
        onSaveAnnotation={handleSaveAnnotation}
        prefillData={selectedResult?.parsedResume}
        confidenceData={selectedResult?.parsedResume?.additional?._confidence}
      />
    </div>
  );
}
