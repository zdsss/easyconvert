import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvaluationStore } from '@lib/store/evaluationStore';
import { evaluationApi } from '@lib/api/evaluationApi';
import { logger } from '@lib/logger';
import { adaptTaskResponse } from '@lib/utils';
import Icon from '@components/ui/Icon';
import EmptyState from '@components/ui/EmptyState';
import Pagination from '@components/ui/Pagination';
import { SkeletonCard } from '@components/ui/Skeleton';
import EvaluationCompareModal from '@components/EvaluationCompareModal';
import EvaluationCard from '@components/EvaluationCard';

const PAGE_SIZE = 8;

const FILTER_LABELS: Record<string, string> = {
  all: '全部', pending: '待处理', processing: '处理中', completed: '已完成', failed: '失败',
};

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

  const toggleSelect = (taskId: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      if (next.size < 2) next.add(taskId);
    } else {
      next.delete(taskId);
    }
    setSelectedIds(next);
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
            {paginatedTasks.map(task => (
              <EvaluationCard
                key={task.id}
                task={task}
                selected={selectedIds.has(task.id)}
                onSelect={checked => toggleSelect(task.id, checked)}
                onClick={() => navigate(`/evaluation/${task.id}`)}
              />
            ))}
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
