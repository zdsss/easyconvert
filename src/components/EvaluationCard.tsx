import React from 'react';
import Icon from '@components/ui/Icon';
import { STATUS_MAP } from '@lib/utils';
import type { EvaluationTask } from '@lib/store/evaluationStore';

interface Props {
  task: EvaluationTask;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
}

function EvaluationCard({ task, selected, onSelect, onClick }: Props) {
  const statusInfo = STATUS_MAP[task.status] || STATUS_MAP.pending;
  const total = task.stats.totalFiles;
  const processed = task.stats.processedFiles || (task.stats.successCount + task.stats.failureCount);
  const progressPct = total > 0 ? (processed / total) * 100 : 0;

  return (
    <div className={`card-hover p-5 cursor-pointer group relative ${selected ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`选择 ${task.name}`}
          checked={selected}
          onChange={e => onSelect(e.target.checked)}
          className="w-4 h-4 rounded border-border text-brand-600 focus:ring-brand-500 cursor-pointer"
        />
      </div>
      <div onClick={onClick} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onClick(); }}>
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
}

export default React.memo(EvaluationCard);
