import { useEffect, useState } from 'react';
import { evaluationApi } from '@lib/api/evaluationApi';
import { analyzeWeakFields, type FieldMetric } from '@lib/promptOptimizer';
import { aggregateFieldMetrics } from '@lib/metricsCalculator';
import { getPrompt } from '@shared/prompts';
import Icon from '@components/ui/Icon';

interface Experiment {
  id: string;
  taskIds: string[];
  weakFields: string[];
  suggestion: string;
  createdAt: string;
}

interface TaskOption {
  id: string;
  name: string;
}

export default function PromptLabPage() {
  const [fieldMetrics, setFieldMetrics] = useState<FieldMetric[]>([]);
  const [weakFields, setWeakFields] = useState<FieldMetric[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [taskA, setTaskA] = useState('');
  const [taskB, setTaskB] = useState('');
  const [comparison, setComparison] = useState<{ field: string; accA: number; accB: number; diff: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const samplePrompt = getPrompt('standard', 'general');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [taskList, expList] = await Promise.all([
        evaluationApi.getTasks(),
        fetch('/api/prompt-experiments').then(r => r.json()),
      ]);
      const allTasks = Array.isArray(taskList) ? taskList : [];
      setTasks(allTasks.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
      setExperiments(Array.isArray(expList) ? expList : []);

      // Aggregate field metrics from completed tasks with results
      const metrics = await aggregateFieldMetricsFromTasks(allTasks.filter((t: { status: string }) => t.status === 'completed'));
      setFieldMetrics(metrics);
      setWeakFields(analyzeWeakFields(metrics));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function aggregateFieldMetricsFromTasks(completedTasks: { id: string }[]): Promise<FieldMetric[]> {
    const fieldMap: Record<string, { total: number; correct: number }> = {};
    for (const task of completedTasks.slice(0, 10)) {
      try {
        const results = await evaluationApi.getResults(task.id);
        if (!Array.isArray(results)) continue;
        const taskMap = aggregateFieldMetrics(results as Array<{ metrics?: unknown }>);
        for (const [field, { total, correct }] of Object.entries(taskMap)) {
          if (!fieldMap[field]) fieldMap[field] = { total: 0, correct: 0 };
          fieldMap[field].total += total;
          fieldMap[field].correct += correct;
        }
      } catch {
        // skip
      }
    }
    return Object.entries(fieldMap)
      .map(([field, { total, correct }]) => ({
        field,
        accuracy: total > 0 ? correct / total : 0,
        count: total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }

  async function handleSubmitExperiment() {
    if (!suggestion.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/prompt-experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: [taskA, taskB].filter(Boolean),
          weakFields: weakFields.map(w => w.field),
          suggestion: suggestion.trim(),
        }),
      });
      const exp = await res.json();
      setExperiments(prev => [exp, ...prev]);
      setSuggestion('');
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompare() {
    if (!taskA || !taskB) return;
    try {
      const [resultsA, resultsB] = await Promise.all([
        evaluationApi.getResults(taskA),
        evaluationApi.getResults(taskB),
      ]);
      const accMapA = buildFieldAccMap(resultsA);
      const accMapB = buildFieldAccMap(resultsB);
      const allFields = new Set([...Object.keys(accMapA), ...Object.keys(accMapB)]);
      const rows = Array.from(allFields).map(field => ({
        field,
        accA: accMapA[field] ?? 0,
        accB: accMapB[field] ?? 0,
        diff: (accMapB[field] ?? 0) - (accMapA[field] ?? 0),
      }));
      rows.sort((a, b) => a.diff - b.diff);
      setComparison(rows);
    } catch {
      setComparison([]);
    }
  }

  function buildFieldAccMap(results: unknown[]): Record<string, number> {
    if (!Array.isArray(results)) return {};
    const map = aggregateFieldMetrics(results as Array<{ metrics?: unknown }>);
    return Object.fromEntries(
      Object.entries(map).map(([f, { total, correct }]) => [f, total > 0 ? correct / total : 0])
    );
  }

  function fmtPct(n: number) {
    return (n * 100).toFixed(1) + '%';
  }

  function diffColor(diff: number) {
    if (diff > 0.05) return 'text-status-success';
    if (diff < -0.05) return 'text-status-error';
    return 'text-text-secondary';
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">提示词实验室</h1>
        <p className="text-sm text-text-secondary mt-1">分析弱字段、优化提示词、对比评测结果</p>
      </div>

      {/* Field accuracy distribution */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Icon name="bar-chart" size={18} className="text-brand-600" />
          字段准确率分布
        </h2>
        {fieldMetrics.length === 0 ? (
          <p className="text-sm text-text-tertiary">暂无评测数据，请先完成评测任务</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-text-secondary">字段</th>
                  <th className="pb-2 font-medium text-text-secondary">准确率</th>
                  <th className="pb-2 font-medium text-text-secondary">样本数</th>
                  <th className="pb-2 font-medium text-text-secondary">状态</th>
                </tr>
              </thead>
              <tbody>
                {fieldMetrics.map(m => (
                  <tr key={m.field} className="border-b border-border/50">
                    <td className="py-2 text-text-primary font-medium">{m.field}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-surface-tertiary rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${m.accuracy >= 0.7 ? 'bg-status-success' : m.accuracy >= 0.4 ? 'bg-yellow-500' : 'bg-status-error'}`}
                            style={{ width: `${m.accuracy * 100}%` }}
                          />
                        </div>
                        <span className="text-text-secondary">{fmtPct(m.accuracy)}</span>
                      </div>
                    </td>
                    <td className="py-2 text-text-secondary">{m.count}</td>
                    <td className="py-2">
                      {m.accuracy < 0.7 ? (
                        <span className="badge-error">弱</span>
                      ) : (
                        <span className="badge-success">良好</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Current prompt (read-only) */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Icon name="code" size={18} className="text-brand-600" />
          当前提示词
        </h2>
        <pre className="bg-surface-tertiary rounded-lg p-4 text-xs text-text-secondary overflow-x-auto max-h-64 whitespace-pre-wrap">
          {samplePrompt}
        </pre>
      </section>

      {/* AI optimization suggestion */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Icon name="zap" size={18} className="text-brand-600" />
          AI 优化建议
        </h2>
        {weakFields.length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-text-secondary mb-2">
              检测到 {weakFields.length} 个弱字段：
              {weakFields.map(w => (
                <span key={w.field} className="inline-block badge-error ml-1">{w.field} ({fmtPct(w.accuracy)})</span>
              ))}
            </p>
          </div>
        )}
        <textarea
          value={suggestion}
          onChange={e => setSuggestion(e.target.value)}
          placeholder="输入优化建议或让 AI 生成改进方案..."
          className="input w-full h-28 resize-none text-sm"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSubmitExperiment}
            disabled={submitting || !suggestion.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <Icon name="plus" size={16} />
            {submitting ? '提交中...' : '创建实验'}
          </button>
        </div>

        {experiments.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">历史实验</h3>
            <div className="space-y-2">
              {experiments.slice(0, 5).map(exp => (
                <div key={exp.id} className="bg-surface-tertiary rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-text-tertiary text-xs mb-1">
                    <span>{exp.id.slice(0, 8)}</span>
                    <span>{new Date(exp.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-text-primary">{exp.suggestion}</p>
                  {exp.weakFields.length > 0 && (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {exp.weakFields.map(f => (
                        <span key={f} className="badge-neutral text-xs">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* A/B comparison */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Icon name="grid" size={18} className="text-brand-600" />
          A/B 对比
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select value={taskA} onChange={e => setTaskA(e.target.value)} className="input flex-1">
            <option value="">选择任务 A</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select value={taskB} onChange={e => setTaskB(e.target.value)} className="input flex-1">
            <option value="">选择任务 B</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={handleCompare}
            disabled={!taskA || !taskB}
            className="btn-primary whitespace-nowrap"
          >
            对比
          </button>
        </div>

        {comparison.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-text-secondary">字段</th>
                  <th className="pb-2 font-medium text-text-secondary">任务 A</th>
                  <th className="pb-2 font-medium text-text-secondary">任务 B</th>
                  <th className="pb-2 font-medium text-text-secondary">差异</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(row => (
                  <tr key={row.field} className="border-b border-border/50">
                    <td className="py-2 text-text-primary font-medium">{row.field}</td>
                    <td className="py-2 text-text-secondary">{fmtPct(row.accA)}</td>
                    <td className="py-2 text-text-secondary">{fmtPct(row.accB)}</td>
                    <td className={`py-2 font-medium ${diffColor(row.diff)}`}>
                      {row.diff > 0 ? '+' : ''}{fmtPct(row.diff)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
