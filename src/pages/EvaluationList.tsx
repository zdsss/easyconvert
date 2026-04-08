import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvaluationStore, type EvaluationTask } from '@lib/store/evaluationStore';
import { evaluationApi } from '@lib/api/evaluationApi';
import { logger } from '@lib/logger';
import type { TaskResponse } from '@lib/types';
import Icon from '@components/ui/Icon';
import EmptyState from '@components/ui/EmptyState';
import Pagination from '@components/ui/Pagination';
import { SkeletonCard } from '@components/ui/Skeleton';
import EvaluationCompareModal from '@components/EvaluationCompareModal';

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

const STATUS_MAP: Record<string, { label: string; class: string; dotClass: string }> = {
  completed: { label: '已完成', class: 'badge-success', dotClass: 'bg-status-success' },
  processing: { label: '处理中', class: 'badge-info', dotClass: 'bg-status-info animate-pulse' },
  failed: { label: '失败', class: 'badge-error', dotClass: 'bg-status-error' },
  pending: { label: '待处理', class: 'badge-neutral', dotClass: 'bg-gray-400' },
};

const PAGE_SIZE = 8;

export default function EvaluationList() {
  const navigate = useNavigate();
  const { tasks, setTasks, isLoading, setLoading } = useEvaluationStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await evaluationApi.getTasks();
      setTasks(Array.isArray(data) ? data.map(adaptTaskResponse) : []);
    } catch (error) {
      logger.error('Failed to load tasks', error instanceof Error ? error : new Error(String(error)));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  let filteredTasks = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredTasks = filteredTasks.filter(t => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  }
  filteredTasks = [...filteredTasks].sort((a, b) =>
    sortBy === 'date' ? b.createdAt.getTime() - a.createdAt.getTime() : a.name.localeCompare(b.name)
  );

  const totalItems = filteredTasks.length;
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchQuery, sortBy]);

  const statusCounts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    processing: tasks.filter(t => t.status === 'processing').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  const FILTER_LABELS: Record<string, string> = {
    all: '全部', pending: '待处理', processing: '处理中', completed: '已完成', failed: '失败',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">评测任务</h1>
          <p className="text-sm text-text-secondary mt-1">管理和追踪简历解析评测</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size === 2 && (
            <button onClick={() => setShowCompare(true)} className="btn-secondary flex items-center gap-2">
              <Icon name="columns" size={16} />
              对比选中
            </button>
          )}
          <button onClick={() => navigate('/evaluation/new')} className="btn-primary flex items-center gap-2">
            <Icon name="plus" size={16} />
            新建评测
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {tasks.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors duration-150 ${
                  statusFilter === status
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-surface text-text-secondary border border-border hover:bg-surface-tertiary'
                }`}
              >
                {FILTER_LABELS[status]} ({count})
              </button>
            ))}
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <div className="relative">
              <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索任务..."
                className="input pl-9 py-1.5 w-48"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'date' | 'name')}
              className="input py-1.5 w-auto"
            >
              <option value="date">按时间</option>
              <option value="name">按名称</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : paginatedTasks.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title={tasks.length === 0 ? '暂无评测任务' : '无匹配任务'}
          description={tasks.length === 0 ? '创建第一个评测任务来开始' : '尝试切换筛选条件'}
          action={tasks.length === 0 ? { label: '创建评测', onClick: () => navigate('/evaluation/new') } : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedTasks.map(task => {
              const statusInfo = STATUS_MAP[task.status] || STATUS_MAP.pending;
              const total = task.stats.totalFiles;
              const processed = task.stats.processedFiles || (task.stats.successCount + task.stats.failureCount);
              const progressPct = total > 0 ? (processed / total) * 100 : 0;

              return (
                <div
                  key={task.id}
                  className={`card-hover p-5 cursor-pointer group relative ${selectedIds.has(task.id) ? 'ring-2 ring-brand-500' : ''}`}
                >
                  <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={e => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) {
                          if (next.size < 2) next.add(task.id);
                        } else {
                          next.delete(task.id);
                        }
                        setSelectedIds(next);
                      }}
                      className="w-4 h-4 rounded border-border text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </div>
                  <div onClick={() => navigate(`/evaluation/${task.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.dotClass}`} />
                        <span className={statusInfo.class}>{statusInfo.label}</span>
                      </div>
                      <h3 className="text-base font-semibold text-text-primary truncate mt-1.5 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                        {task.name}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-text-secondary mt-0.5 truncate">{task.description}</p>
                      )}
                    </div>
                    <Icon name="chevron-right" size={18} className="text-text-tertiary group-hover:text-brand-500 transition-colors shrink-0 mt-1" />
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-text-tertiary mb-1">
                        <span>{processed}/{total} 已处理</span>
                        <span>{progressPct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-surface-tertiary rounded-full h-1.5 overflow-hidden">
                        <div className="bg-brand-600 h-1.5 transition-all duration-500 rounded-full" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Mini metrics */}
                  <div className="flex gap-4 text-sm text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Icon name="file-text" size={14} className="text-text-tertiary" />
                      {total} 文件
                    </span>
                    <span className="flex items-center gap-1 text-status-success">
                      <Icon name="check-circle" size={14} />
                      {task.stats.successCount}
                    </span>
                    {task.stats.failureCount > 0 && (
                      <span className="flex items-center gap-1 text-status-error">
                        <Icon name="x-circle" size={14} />
                        {task.stats.failureCount}
                      </span>
                    )}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {showCompare && selectedIds.size === 2 && (
        <EvaluationCompareModal
          taskIds={Array.from(selectedIds) as [string, string]}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
