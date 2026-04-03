import { useEffect, useState } from 'react';
import { useParseHistoryStore } from '@lib/store/parseHistoryStore';
import ParseHistoryDrawer from '@components/ParseHistoryDrawer';
import ExportMenu from '@components/ExportMenu';
import Icon from '@components/ui/Icon';
import EmptyState from '@components/ui/EmptyState';
import Pagination from '@components/ui/Pagination';
import ConfirmDialog from '@components/ui/ConfirmDialog';
import { SkeletonCard } from '@components/ui/Skeleton';

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { label: string; class: string; dotClass: string }> = {
  completed: { label: '成功', class: 'badge-success', dotClass: 'bg-status-success' },
  failed: { label: '失败', class: 'badge-error', dotClass: 'bg-status-error' },
  processing: { label: '处理中', class: 'badge-info', dotClass: 'bg-status-info animate-pulse' },
  pending: { label: '待处理', class: 'badge-neutral', dotClass: 'bg-gray-400' },
};

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ms: number | null): string {
  if (ms == null) return '-';
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ParseHistoryPage() {
  const { items, total, currentPage, selectedItem, isLoading, loadList, loadDetail, removeItem, clearAll, setSelectedItem } = useParseHistoryStore();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => { loadList(1, statusFilter || undefined, searchQuery || undefined); }, []);

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    loadList(1, status || undefined, searchQuery || undefined);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    loadList(1, statusFilter || undefined, q || undefined);
  };

  const handlePageChange = (page: number) => {
    loadList(page, statusFilter || undefined, searchQuery || undefined);
  };

  const handleRowClick = async (id: string) => {
    await loadDetail(id);
  };

  const handleDelete = async (id: string) => {
    await removeItem(id);
    loadList(currentPage, statusFilter || undefined, searchQuery || undefined);
  };

  const handleClearAll = async () => {
    await clearAll();
    setShowClearConfirm(false);
  };

  const FILTERS = [
    { key: '', label: '全部' },
    { key: 'completed', label: '成功' },
    { key: 'failed', label: '失败' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">解析历史</h1>
          <p className="text-sm text-text-secondary mt-1">查看所有解析记录</p>
        </div>
        {total > 0 && (
          <button onClick={() => setShowClearConfirm(true)} className="btn-ghost text-status-error flex items-center gap-2 text-sm">
            <Icon name="trash-2" size={16} />
            清空历史
          </button>
        )}
      </div>

      {/* Filter bar */}
      {(total > 0 || statusFilter || searchQuery) && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors duration-150 ${
                  statusFilter === f.key
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-surface text-text-secondary border border-border hover:bg-surface-tertiary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto">
            <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="搜索文件名..."
              className="input pl-9 py-1.5 w-48"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="clock"
          title={total === 0 && !statusFilter && !searchQuery ? '暂无解析记录' : '无匹配记录'}
          description={total === 0 && !statusFilter && !searchQuery ? '解析简历后，记录会自动保存在这里' : '尝试切换筛选条件'}
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">文件名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide hidden sm:table-cell">大小</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide hidden sm:table-cell">耗时</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">时间</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wide">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item.id)}
                      className="border-t border-border-light hover:bg-surface-tertiary/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon name="file-text" size={16} className="text-text-tertiary shrink-0" />
                          <span className="font-medium text-text-primary truncate max-w-[200px]">{item.file_name}</span>
                          <LanguageBadge lang={item.result?.additional?.language} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                          <span className={statusInfo.class}>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">{formatSize(item.file_size)}</td>
                      <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">{formatTime(item.processing_time)}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{new Date(item.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.result && <ExportMenu resume={item.result} />}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="btn-ghost p-1 text-text-tertiary hover:text-status-error"
                            title="删除"
                          >
                            <Icon name="trash-2" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Detail drawer */}
      <ParseHistoryDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
      />

      {/* Clear confirm dialog */}
      <ConfirmDialog
        open={showClearConfirm}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
        title="清空所有解析历史"
        description="此操作不可撤销，所有解析记录将被永久删除。"
        variant="danger"
        confirmLabel="清空"
      />
    </div>
  );
}
