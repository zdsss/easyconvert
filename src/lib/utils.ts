import type { TaskResponse } from './types';

/** Format byte count to human-readable string */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Traverse an object by dot-separated path */
export function getValueByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((curr, key) => {
    if (curr && typeof curr === 'object') return (curr as Record<string, unknown>)?.[key];
    return undefined;
  }, obj);
}

/** Adapt API TaskResponse to EvaluationTask shape */
export function adaptTaskResponse(task: TaskResponse) {
  return {
    ...task,
    type: (task.type as 'single' | 'batch') || 'single',
    config: task.config || { enableFieldLevel: false, enableClassification: false, enableProcessTrace: false, accuracyMethod: 'exact' as const },
    stats: task.stats || { totalFiles: 0, processedFiles: 0, successCount: 0, failureCount: 0 },
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt || task.createdAt)
  };
}

/** Unified status display map */
export const STATUS_MAP: Record<string, { label: string; class: string; dotClass: string }> = {
  completed: { label: '已完成', class: 'badge-success', dotClass: 'bg-status-success' },
  processing: { label: '处理中', class: 'badge-info', dotClass: 'bg-status-info animate-pulse' },
  failed: { label: '失败', class: 'badge-error', dotClass: 'bg-status-error' },
  pending: { label: '待处理', class: 'badge-neutral', dotClass: 'bg-text-tertiary' },
};
