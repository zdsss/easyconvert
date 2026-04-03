import type { ParseHistoryItem } from '@lib/api/parseHistoryApi';
import Drawer from './ui/Drawer';
import ParseResultTabs from './ParseResultTabs';
import Icon from './ui/Icon';

interface Props {
  item: ParseHistoryItem | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function ParseHistoryDrawer({ item, onClose, onDelete }: Props) {
  if (!item) return null;

  const isSuccess = item.status === 'completed';
  const result = typeof item.result === 'string' ? (() => { try { return JSON.parse(item.result); } catch { return null; } })() : item.result;

  return (
    <Drawer
      open={!!item}
      onClose={onClose}
      title={item.file_name}
      subtitle={isSuccess
        ? `耗时 ${item.processing_time ? (item.processing_time / 1000).toFixed(1) + 's' : '-'} · ${new Date(item.created_at).toLocaleString()}`
        : `失败 · ${new Date(item.created_at).toLocaleString()}`
      }
      footer={
        <div className="flex justify-between">
          {onDelete && (
            <button onClick={() => onDelete(item.id)} className="btn-ghost text-status-error flex items-center gap-1.5 text-sm">
              <Icon name="trash-2" size={15} />
              删除
            </button>
          )}
          <button onClick={onClose} className="btn-secondary ml-auto">关闭</button>
        </div>
      }
    >
      {isSuccess && result ? (
        <ParseResultTabs resume={result} />
      ) : (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-status-error-bg border border-red-200 dark:border-red-800">
          <Icon name="alert-triangle" size={18} className="text-status-error shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-400">解析失败</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{item.error || '未知错误'}</p>
          </div>
        </div>
      )}

      {/* Meta info */}
      <div className="mt-6 pt-4 border-t border-border text-xs text-text-tertiary flex flex-wrap gap-4">
        <span>大小：{formatSize(item.file_size)}</span>
        <span>类型：{item.mime_type}</span>
        {item.file_hash && <span>Hash：{item.file_hash.slice(0, 12)}...</span>}
      </div>
    </Drawer>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
