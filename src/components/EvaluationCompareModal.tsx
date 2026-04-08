import { useEffect, useState } from 'react';
import { evaluationApi } from '@lib/api/evaluationApi';
import type { EvaluationResult } from '@lib/types';
import Icon from '@components/ui/Icon';

interface Props {
  taskIds: [string, string];
  onClose: () => void;
}

interface FieldAvg {
  field: string;
  avg1: number;
  avg2: number;
}

function aggregateFieldMetrics(results: EvaluationResult[]): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const r of results) {
    const fm = r.metrics?.fieldMetrics;
    if (!fm) continue;
    for (const [field, val] of Object.entries(fm)) {
      if (!map[field]) map[field] = [];
      map[field].push(Number(val) || 0);
    }
  }
  return map;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export default function EvaluationCompareModal({ taskIds, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FieldAvg[]>([]);
  const [taskNames, setTaskNames] = useState<[string, string]>(['任务1', '任务2']);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [res1, res2, task1, task2] = await Promise.all([
          evaluationApi.getResults(taskIds[0]),
          evaluationApi.getResults(taskIds[1]),
          evaluationApi.getTask(taskIds[0]),
          evaluationApi.getTask(taskIds[1]),
        ]);
        setTaskNames([task1.name, task2.name]);

        const map1 = aggregateFieldMetrics(res1);
        const map2 = aggregateFieldMetrics(res2);
        const allFields = new Set([...Object.keys(map1), ...Object.keys(map2)]);

        const fieldRows: FieldAvg[] = Array.from(allFields).sort().map(field => ({
          field,
          avg1: avg(map1[field] || []),
          avg2: avg(map2[field] || []),
        }));
        setRows(fieldRows);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [taskIds[0], taskIds[1]]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface rounded-xl border border-border shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-scale-in p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">跨任务对比</h3>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <Icon name="x" size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-text-secondary">
            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-2" />
            加载中...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <Icon name="info" size={32} className="mx-auto mb-2 text-text-tertiary" />
            <p>无字段级指标数据可对比</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">字段名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide truncate max-w-[160px]" title={taskNames[0]}>{taskNames[0]}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide truncate max-w-[160px]" title={taskNames[1]}>{taskNames[1]}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Delta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const delta = row.avg2 - row.avg1;
                  return (
                    <tr key={row.field} className="border-t border-border-light hover:bg-surface-secondary">
                      <td className="px-4 py-2.5 font-medium text-text-primary">{row.field}</td>
                      <td className="px-4 py-2.5 font-mono">{row.avg1.toFixed(1)}%</td>
                      <td className="px-4 py-2.5 font-mono">{row.avg2.toFixed(1)}%</td>
                      <td className={`px-4 py-2.5 font-mono font-semibold ${delta > 0 ? 'text-status-success' : delta < 0 ? 'text-status-error' : 'text-text-secondary'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
