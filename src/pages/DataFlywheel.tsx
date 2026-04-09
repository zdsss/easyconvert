import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@components/ui/Icon';
import EmptyState from '@components/ui/EmptyState';
import { SkeletonCard } from '@components/ui/Skeleton';
import LanguageBadge from '@components/ui/LanguageBadge';

interface Candidate {
  id: string;
  fileName: string;
  fileSize: number;
  avgConfidence: number;
  qualityScore: number | null;
  language: string | null;
  createdAt: string;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct < 30 ? 'bg-red-500' : pct < 50 ? 'bg-orange-500' : 'bg-yellow-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden max-w-[100px]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-secondary font-mono w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function DataFlywheel() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const fetchCandidates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/data-flywheel');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCandidates(data.candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCandidates(); }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map(c => c.id)));
    }
  };

  const handleCreateEvaluation = async () => {
    if (selected.size === 0) return;
    setCreating(true);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `数据飞轮 - ${new Date().toLocaleDateString('zh-CN')}`,
          description: `从数据飞轮选取 ${selected.size} 条低置信度样本`,
          type: 'batch',
          config: {
            enableFieldLevel: true,
            enableClassification: true,
            enableProcessTrace: true,
            accuracyMethod: 'partial',
            strategy: 'auto',
            difficultyFilter: 'all',
            concurrency: 3,
            sourceIds: Array.from(selected),
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const task = await res.json();
      navigate(`/evaluation/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建评测任务失败');
      setCreating(false);
    }
  };

  // Stats
  const langDist = candidates.reduce<Record<string, number>>((acc, c) => {
    const lang = c.language || 'unknown';
    acc[lang] = (acc[lang] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Icon name="refresh-cw" size={20} className="text-brand-600" />
            数据飞轮
          </h1>
          <p className="text-sm text-text-secondary mt-1">基于主动学习，自动发现低置信度样本加入评测</p>
        </div>
        <button onClick={fetchCandidates} className="btn-ghost flex items-center gap-2 text-sm" disabled={loading}>
          <Icon name="refresh" size={16} />
          刷新
        </button>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-lg bg-status-error-bg border border-red-200 dark:border-red-800">
          <Icon name="alert-triangle" size={16} className="text-status-error shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : candidates.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title="暂无低置信度样本"
          description="所有已完成的解析结果置信度均达标，无需额外评测"
        />
      ) : (
        <>
          {/* Table */}
          <div className="card overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === candidates.length && candidates.length > 0}
                      onChange={toggleAll}
                      className="rounded border-border text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">文件名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide hidden sm:table-cell">语言</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">平均置信度</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide hidden sm:table-cell">质量分</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(c => (
                  <tr
                    key={c.id}
                    className="border-t border-border-light hover:bg-surface-tertiary/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-border text-brand-600 focus:ring-brand-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon name="file-text" size={16} className="text-text-tertiary shrink-0" />
                        <span className="font-medium text-text-primary truncate max-w-[240px]">{c.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <LanguageBadge lang={c.language} />
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBar value={c.avgConfidence} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-text-secondary">{c.qualityScore != null ? c.qualityScore : '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stats panel */}
          <div className="card p-4 mb-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-text-tertiary">总候选数</span>
                <span className="ml-2 font-semibold text-text-primary">{candidates.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-tertiary">语言分布</span>
                <div className="flex gap-1.5">
                  {Object.entries(langDist).map(([lang, count]) => (
                    <span key={lang} className="px-2 py-0.5 rounded bg-surface-secondary text-xs text-text-secondary">
                      {lang === 'unknown' ? '未知' : lang.toUpperCase()} {count}
                    </span>
                  ))}
                </div>
              </div>
              {selected.size > 0 && (
                <div>
                  <span className="text-text-tertiary">已选中</span>
                  <span className="ml-2 font-semibold text-brand-600">{selected.size}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          <div className="flex justify-end">
            <button
              onClick={handleCreateEvaluation}
              disabled={selected.size === 0 || creating}
              className="btn-primary flex items-center gap-2"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="plus" size={16} />
              )}
              加入评测任务 {selected.size > 0 && `(${selected.size})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
