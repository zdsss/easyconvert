import { useState } from 'react';
import type { EvaluationResult, Resume } from '@lib/types';
import Drawer from './ui/Drawer';
import ComparisonView from './ComparisonView';
import ProcessTimeline from './ProcessTimeline';
import Icon from './ui/Icon';

interface Props {
  result: EvaluationResult | null;
  onClose: () => void;
  onSaveAnnotation?: (annotation: unknown) => void;
  prefillData?: Resume;
  confidenceData?: Record<string, number>;
}

const TABS = [
  { key: 'parsed', label: '解析结果', icon: 'file-text' },
  { key: 'compare', label: '对比标注', icon: 'eye' },
  { key: 'timeline', label: '时间线', icon: 'clock' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function EvaluationResultDrawer({ result, onClose, onSaveAnnotation, prefillData, confidenceData }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('parsed');

  if (!result) return null;

  return (
    <Drawer
      open={!!result}
      onClose={onClose}
      title={result.fileName}
      subtitle={result.error ? `失败: ${result.error}` : `准确率 ${result.metrics.accuracy.toFixed(1)}% · ${result.processingTime}ms`}
      width={600}
      footer={
        onSaveAnnotation && (
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-secondary">关闭</button>
          </div>
        )
      }
    >
      {/* Tab bar */}
      <div className="flex border-b border-border mb-4 -mx-6 px-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'parsed' && <ParsedTab result={result} />}
        {activeTab === 'compare' && <CompareTab result={result} onSaveAnnotation={onSaveAnnotation} prefillData={prefillData} confidenceData={confidenceData} />}
        {activeTab === 'timeline' && <TimelineTab result={result} />}
      </div>
    </Drawer>
  );
}

function ParsedTab({ result }: { result: EvaluationResult }) {
  const r = result.parsedResume;
  if (!r) return <div className="text-sm text-status-error">解析失败：{result.error}</div>;

  return (
    <div className="space-y-5">
      {/* Basic info */}
      <div>
        <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">基本信息</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: '姓名', value: r.basics?.name },
            { label: '电话', value: r.basics?.phone },
            { label: '邮箱', value: r.basics?.email },
            { label: '职位', value: r.basics?.title },
            { label: '地点', value: r.basics?.location },
          ].map(f => (
            <div key={f.label} className="flex gap-2">
              <span className="text-text-tertiary w-12 shrink-0">{f.label}</span>
              <span className="text-text-primary">{f.value || '-'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Work */}
      {r.work?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
            工作经历（{r.work.length} 段）
          </div>
          <div className="space-y-2">
            {r.work.map((w, i) => (
              <div key={i} className="p-3 bg-surface-secondary rounded-lg">
                <p className="text-sm font-medium text-text-primary">{w.company} · {w.position}</p>
                <p className="text-xs text-text-tertiary">{w.startDate} ~ {w.endDate || '至今'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {r.education?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
            教育背景（{r.education.length} 段）
          </div>
          <div className="space-y-2">
            {r.education.map((e, i) => (
              <div key={i} className="p-3 bg-surface-secondary rounded-lg">
                <p className="text-sm font-medium text-text-primary">{e.institution || e.school}</p>
                <p className="text-xs text-text-secondary">{e.degree} · {e.major || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {(r.skills?.length ?? 0) > 0 && (
        <div>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">技能</div>
          <div className="flex flex-wrap gap-1.5">
            {r.skills!.map((s: string, i: number) => (
              <span key={i} className="badge-info">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="pt-3 border-t border-border text-xs text-text-tertiary flex flex-wrap gap-4">
        <span>分类：{result.classification?.difficulty} / {result.classification?.completeness} / {result.classification?.scenario}</span>
        <span>缓存：{result.fromCache ? '命中' : '未命中'}</span>
        <span>耗时：{result.processingTime}ms</span>
      </div>
    </div>
  );
}

function ConfidenceBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  const cls = score >= 0.9 ? 'bg-emerald-500' : score >= 0.7 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <span className={`ml-1 px-1 py-0.5 rounded text-xs text-white font-mono ${cls}`}>
      {(score * 100).toFixed(0)}%
    </span>
  );
}

function CompareTab({ result, onSaveAnnotation, prefillData, confidenceData }: {
  result: EvaluationResult;
  onSaveAnnotation?: (annotation: unknown) => void;
  prefillData?: Resume;
  confidenceData?: Record<string, number>;
}) {
  const [annotation, setAnnotation] = useState<Record<string, Record<string, string>>>(() => {
    if (result.annotation && Object.keys(result.annotation).length > 0) {
      const a = result.annotation;
      return {
        basics: { name: a.basics?.name || '', phone: a.basics?.phone || '', email: a.basics?.email || '' },
      };
    }
    if (prefillData?.basics) {
      return { basics: { name: prefillData.basics.name, phone: prefillData.basics.phone, email: prefillData.basics.email } };
    }
    return {} as Record<string, Record<string, string>>;
  });

  if (!result.annotation && !result.parsedResume) {
    return <div className="text-sm text-text-secondary">无标注数据可对比</div>;
  }

  const updateField = (section: string, field: string, value: string) => {
    setAnnotation({
      ...annotation,
      [section]: { ...annotation[section], [field]: value }
    });
  };

  return (
    <div className="space-y-5">
      {result.annotation && result.parsedResume && (
        <ComparisonView parsed={result.parsedResume} annotation={result.annotation} />
      )}

      {/* Inline annotation editor */}
      <div className="pt-4 border-t border-border">
        <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">编辑标注</div>
        <div className="space-y-2">
          {['name', 'phone', 'email'].map(field => (
            <div key={field} className="grid grid-cols-3 gap-2 items-center text-sm">
              <span className="text-text-secondary capitalize">
                {field === 'name' ? '姓名' : field === 'phone' ? '电话' : '邮箱'}
                <ConfidenceBadge score={confidenceData?.[`basics.${field}`]} />
              </span>
              <span className="text-text-tertiary">{result.parsedResume?.basics?.[field as keyof typeof result.parsedResume.basics] || '-'}</span>
              <input
                type="text"
                value={annotation.basics?.[field] || ''}
                onChange={e => updateField('basics', field, e.target.value)}
                className="input py-1.5"
                placeholder="标注值"
              />
            </div>
          ))}
        </div>
        {onSaveAnnotation && (
          <button
            onClick={() => onSaveAnnotation(annotation)}
            className="btn-primary mt-3 flex items-center gap-2"
          >
            <Icon name="check-circle" size={16} />
            保存标注
          </button>
        )}
      </div>
    </div>
  );
}

function TimelineTab({ result }: { result: EvaluationResult }) {
  if (!result.processTrace) {
    return <div className="text-sm text-text-secondary">无处理时间线数据</div>;
  }
  return <ProcessTimeline trace={result.processTrace} />;
}
